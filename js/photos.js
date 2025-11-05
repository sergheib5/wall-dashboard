let photos=[];
let photoIndex=0;
let photosLoaded=false;

// Dynamically load photos from photos.json
async function initPhotos(){
  try{
    const response=await fetch('data/photos.json');
    if(!response.ok){
      console.warn('Could not load photos.json, using fallback');
      photos=['data/IMG_1523.jpeg','data/IMG_5053.jpeg','data/IMG_7818.jpeg','data/IMG_9133.jpeg']; // fallback
      photosLoaded=true;
      return;
    }
    photos=await response.json();
    if(photos.length===0){
      console.warn('No photos found in photos.json');
      photosLoaded=true;
      return;
    }
    console.log(`Loaded ${photos.length} photos:`,photos);
    photosLoaded=true;
  }catch(err){
    console.error('Error loading photos:',err);
    // Fallback to known photos
    photos=['data/IMG_1523.jpeg','data/IMG_5053.jpeg','data/IMG_3441.jpeg','data/IMG_7818.jpeg','data/IMG_9133.jpeg'];
    photosLoaded=true;
  }
}

let photoLoadTimeout = null;

function loadPhoto(){
  const el=document.getElementById("photoFrame");
  if(!el)return;
  
  // Clear any pending timeout to prevent pile-up
  if(photoLoadTimeout){
    clearTimeout(photoLoadTimeout);
    photoLoadTimeout=null;
  }
  
  // Wait for photos to load
  if(!photosLoaded||photos.length===0){
    console.log('Photos not loaded yet, waiting...');
    photoLoadTimeout=setTimeout(loadPhoto,100);
    return;
  }
  
  // Fade out current photo
  el.style.opacity='0';
  
  // After fade out, change image and fade in
  setTimeout(()=>{
    el.src=photos[photoIndex];
    console.log(`Showing photo ${photoIndex+1}/${photos.length}: ${photos[photoIndex]}`);
    
    // Wait for image to load, then fade in
    el.onload=()=>{
      el.style.opacity='1';
    };
    
    // Advance to next photo for next time photos slide appears
    // This ensures we don't repeat until all photos shown
    photoIndex=(photoIndex+1)%photos.length;
  },250);
}

// Initialize photos on load
initPhotos();
