let photos=[];
let photoIndex=0;
let photosLoaded=false;
let photosInitPromise=null;
let rotationTimer=null;
let photoRequest=0;
const FALLBACK_PHOTOS=['data/IMG_0258.jpg','data/IMG_1180.jpeg','data/IMG_3441.jpeg','data/IMG_4804.JPG','data/IMG_5053.jpeg','data/IMG_5305.jpg','data/IMG_9133.jpeg','data/IMG_9134.jpg','data/Photo-1.jpg'];

function useFallbackPhotos(){photos=[...FALLBACK_PHOTOS];photosLoaded=true;return photos;}

async function initPhotos(){
  if(photosLoaded)return photos;
  if(photosInitPromise)return await photosInitPromise;
  photosInitPromise=(async()=>{
    try{
      const response=await fetch('data/photos.json?v='+Date.now());
      if(!response.ok)return useFallbackPhotos();
      const nextPhotos=await response.json();
      if(!Array.isArray(nextPhotos)||nextPhotos.length===0){photos=[];photosLoaded=true;return photos;}
      photos=nextPhotos.filter(item=>typeof item==='string'&&item.trim());
      photosLoaded=true;
      return photos;
    }catch(error){console.error('Error loading photos:',error);return useFallbackPhotos();}
    finally{photosInitPromise=null;}
  })();
  return await photosInitPromise;
}

async function loadPhoto(){
  if(!photosLoaded)await initPhotos();
  const request=++photoRequest;
  const today=document.getElementById('todayPhoto');
  const detail=document.getElementById('photoFrame');
  if(!photos.length)return;
  for(let attempt=0;attempt<photos.length;attempt++){
    const index=(photoIndex+attempt)%photos.length;
    const image=new Image();
    try{
      await new Promise((resolve,reject)=>{
        image.onload=resolve;
        image.onerror=()=>reject(new Error(`Could not load photo: ${photos[index]}`));
        image.src=photos[index];
        if(image.complete&&image.naturalWidth)resolve();
      });
      if(request!==photoRequest)return;
      const nextSrc=photos[index];
      for(const [current,next] of [
        [today,document.getElementById('todayPhotoNext')],
        [detail,document.getElementById('photoFrameNext')]
      ]){
        if(!current||!next)continue;
        const active=current.classList.contains('is-visible')?current:next;
        const incoming=active===current?next:current;
        if(active.src===image.src)continue;
        let activated=false;
        const activate=()=>{
          if(activated)return;
          activated=true;
          requestAnimationFrame(()=>{
            incoming.classList.add('is-visible');
            active.classList.remove('is-visible');
            incoming.alt='Family photo';
            incoming.removeAttribute('aria-hidden');
            active.alt='';
            active.setAttribute('aria-hidden','true');
          });
        };
        incoming.onload=activate;
        incoming.src=nextSrc;
        if(incoming.complete&&incoming.naturalWidth)activate();
      }
      photoIndex=(index+1)%photos.length;
      return;
    }catch(error){console.warn(error.message);}
  }
}

function startPhotoRotation(intervalMs){
  if(rotationTimer)clearInterval(rotationTimer);
  const delay=Math.max(30000,Number(intervalMs)||240000);
  rotationTimer=setInterval(()=>{if(!document.hidden)loadPhoto();},delay);
}

function togglePhotoRotation(shouldPlay){
  if(shouldPlay)startPhotoRotation(window.DASHBOARD_CONFIG?.photoRotationMs);
  else if(rotationTimer){clearInterval(rotationTimer);rotationTimer=null;}
}

window.startPhotoRotation=startPhotoRotation;
window.togglePhotoRotation=togglePhotoRotation;
window.showNextPhoto=loadPhoto;
