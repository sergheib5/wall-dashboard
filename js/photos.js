let photos=[];
let photoIndex=0;
let photosLoaded=false;
let photosInitPromise=null;
let rotationTimer=null;
let photoRequest=0;
const FALLBACK_PHOTOS=['data/IMG_0258.jpg','data/IMG_1180.jpeg','data/IMG_3441.jpeg','data/IMG_4804.JPG','data/IMG_5053.jpeg','data/IMG_5305.jpg','data/IMG_9133.jpeg','data/IMG_9134.jpg','data/Photo-1.jpg'];

function useFallbackPhotos(){photos=[...FALLBACK_PHOTOS];photosLoaded=true;return photos;}

function updatePhotoPalette(image){
  const dashboard=document.getElementById('todayView');
  if(!dashboard)return;
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=32;
  const context=canvas.getContext('2d');
  if(!context)return;

  try{
    context.drawImage(image,0,0,32,32);
    const pixels=context.getImageData(0,0,32,32).data;
    const sum=[0,0,0];
    let totalWeight=0;
    for(let i=0;i<pixels.length;i+=4){
      const [red,green,blue]=[pixels[i],pixels[i+1],pixels[i+2]];
      const max=Math.max(red,green,blue);
      const min=Math.min(red,green,blue);
      // Favor visible color over white sky, glare, and near-black shadows.
      const weight=(max-min)*pixels[i+3]*Math.min(1,max/80);
      sum[0]+=red*weight;
      sum[1]+=green*weight;
      sum[2]+=blue*weight;
      totalWeight+=weight;
    }
    const color=totalWeight?sum.map(channel=>channel/totalWeight):[130,148,167];
    const mix=(neutral,strength)=>`rgb(${color.map(channel=>Math.round(neutral+(channel-neutral)*strength)).join(', ')})`;
    dashboard.style.setProperty('--photo-dark',mix(15,.31));
    dashboard.style.setProperty('--photo-light',mix(251,.30));
    dashboard.style.setProperty('--accent',mix(245,.34));
  }catch(error){
    // An image can display even when its pixels cannot be sampled.
    ['--photo-dark','--photo-light','--accent'].forEach(property=>dashboard.style.removeProperty(property));
  }
}

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
      for(const [current,next,decorative] of [
        [today,document.getElementById('todayPhotoNext')],
        [detail,document.getElementById('photoFrameNext')],
        [document.getElementById('wallpaperPhoto'),document.getElementById('wallpaperPhotoNext'),true]
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
            if(request!==photoRequest||incoming.src!==image.src)return;
            incoming.classList.add('is-visible');
            active.classList.remove('is-visible');
            if(decorative){
              updatePhotoPalette(image);
              return;
            }
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
