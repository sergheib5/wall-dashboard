let photos=[];
let photoIndex=0;

// Dynamically load photos from photos.json
async function initPhotos(){
  try{
    const response=await fetch('data/photos.json');
    if(!response.ok){
      console.warn('Could not load photos.json, using fallback');
      photos=['data/IMG_1523.jpeg','data/IMG_5053.jpeg']; // fallback
      return;
    }
    photos=await response.json();
    if(photos.length===0){
      console.warn('No photos found in photos.json');
      return;
    }
    console.log(`Loaded ${photos.length} photos`);
  }catch(err){
    console.error('Error loading photos:',err);
    // Fallback to known photos
    photos=['data/IMG_1523.jpeg','data/IMG_5053.jpeg'];
  }
}

function loadPhoto(){
  const el=document.getElementById("photoFrame");
  if(!el || photos.length===0)return;
  
  // Show current photo
  el.src=photos[photoIndex];
  
  // Advance to next photo for next time photos slide appears
  // This ensures we don't repeat until all photos shown
  photoIndex=(photoIndex+1)%photos.length;
}

// Initialize photos on load
initPhotos();
