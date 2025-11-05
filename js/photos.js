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

function loadPhoto(){
  const el=document.getElementById("photoFrame");
  if(!el)return;
  
  // Wait for photos to load
  if(!photosLoaded||photos.length===0){
    console.log('Photos not loaded yet, waiting...');
    setTimeout(loadPhoto,100);
    return;
  }
  
  // Show current photo
  el.src=photos[photoIndex];
  console.log(`Showing photo ${photoIndex+1}/${photos.length}: ${photos[photoIndex]}`);
  
  // Advance to next photo for next time photos slide appears
  // This ensures we don't repeat until all photos shown
  photoIndex=(photoIndex+1)%photos.length;
}

// Initialize photos on load
initPhotos();
