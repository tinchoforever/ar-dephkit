let user_agent = "";

function initLoadingPage() {
  detectUserAgent();
  document.querySelector("a-scene").addEventListener('loaded', function () {
    addListeners();
  });
  
}

function detectUserAgent() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('safari') != -1) {
    if (ua.indexOf('chrome') > -1) {
      // Chrome
      user_agent = "Chrome";
    } else {
      // Safari
      user_agent = "safari";
    }
  }
  if (ua.indexOf('mobile vr') != -1) {
    // document.querySelector('p').innerHTML = ua;
    user_agent = "FirefoxReality"
  }

  

  //mozilla/5.0(android 7.1.2;mobile vr;rv:66.0)gecko/66.0 firefox/66.0


}

function addListeners() {
  // GET VIDEO LIST
  let loadedVideos = 0;
  const videos = document.querySelectorAll('video');
  const numberOfVideos = videos.length;

  // GET MODEL LIST
  let loadedModels = 0;
  const models = document.querySelectorAll('a-gltf-model');
  const numberOfModels = models.length;

  if (numberOfModels === 0 && numberOfVideos === 0) {
    showStart();
  }

  if (numberOfVideos > 0) {
    let eventToListen = '';
    if (user_agent === 'safari') {
      eventToListen = 'loadedmetadata';
    } else {
      eventToListen = 'canplay';
    }
    for (let i = 0; i < numberOfVideos; i++) {
      videos[i].load();
      videos[i].addEventListener(eventToListen, () => {
        loadedVideos++;
        if (loadedModels === numberOfModels && loadedVideos === numberOfVideos) {
          showStart();
        }
      });
    }
  }

  if (numberOfModels > 0) {
    for (let i = 0; i < numberOfModels; i++) {
      models[i].addEventListener('model-loaded', function () {
        loadedModels++;
        if (loadedModels === numberOfModels && loadedVideos === numberOfVideos) {
          // if (loadedModels === numberOfModels) {
          showStart();
        }
      });
    }
  }
}

// function loadAllMedia(sceneEl) {
//   //Get all DepthKit files 
//   let depthkit = sceneEl.querySelectorAll('a-entity[aframe-depthkit]');
//   for (let i = 0; i < depthkit.length; i++) {
//     depthkit[i].setAttribute('aframe-depthkit', 'autoplay', false);
//   }

//   let videos = sceneEl.querySelectorAll('video');
//   for (let i = 0; i < videos.length; i++) {
//     videos[i].load();
//   }

//   //Get all the audio files 
//   let audio = sceneEl.querySelectorAll('audio');
//   for (let i = 0; i < audio.length; i++) {
//     audio[i].load();
//   }
// }

function playAllMedia(sceneEl) {
  //Get all the video files -
  // Contains : 
  // VidInterview
  // SkyVideo
  let videos = sceneEl.querySelectorAll('video');
  for (let i = 0; i < videos.length; i++) {
    //video[i].load();
    videos[i].play();
  }

  //Get all the audio files 
  let audio = sceneEl.querySelectorAll('audio');
  for (let i = 0; i < audio.length; i++) {
    audio[i].play();
  }

  //Get all DepthKit elements 
  let depthkit = sceneEl.querySelectorAll('a-entity[aframe-depthkit]');
  for (let i = 0; i < depthkit.length; i++) {
    depthkit[i].setAttribute('aframe-depthkit', 'autoplay', true);
  }
}

function showStart() {
  document.getElementById('startButton').className = 'visible';
  document.getElementById('spinner').className = 'hidden';
  const currently_loading_text = document.getElementById('currently_loading_text');
  if (currently_loading_text) {
    currently_loading_text.className = 'hidden';
  }
}

function run() {
  // // sdocument.getElementById('sceneContainer').className = 'visible';
  document.getElementById('startButton').className = 'hidden';
  document.getElementById('main').className = 'hidden';
  // document.body.style.backgroundImage = "url('')";
  // document.body.style.overflow = "";
  // document.documentElement.style.position = "";


  let ascn = document.querySelector('a-scene');
  
  ascn.setAttribute("screenshot","height:256;width:512");
  ascn.removeAttribute("inspector");
  const ua = navigator.userAgent.toLowerCase();
  let isMobile = false;
  if (ua.match(/Android/i) ||
    ua.match(/webOS/i) ||
    ua.match(/iPhone/i) ||
    ua.match(/iPad/i) ||
    ua.match(/iPod/i) ||
    ua.match(/BlackBerry/i) ||
    ua.match(/Windows Phone/i)) {
    isMobile = true;
  }


  if (isMobile || ascn.isMobile) {
    // setTimeout(
    // function play(){
    if (user_agent == "FirefoxReality") {
      ascn.enterVR();
    }
    playAllMedia(ascn);
    // },5000);
  } else {
    ascn.querySelector('#button').setAttribute('start-button', 'texture:/public/video/Start.mp4');
  }

}


// IT MUST BE CALLED BEFORE THE SCENE HAS BEEN ADDED TO THE HTML PAGE
function registerComponents() {
  AFRAME.registerComponent('start-cursor-listener', {
    init: function () {
      let scope = this;
      this.el.addEventListener('click', function (evt) {
        playAllMedia(scope.el.sceneEl);
        scope.el.sceneEl.camera.el.setAttribute('wasd-controls', 'enabled:true');
        let cursor = scope.el.sceneEl.camera.el.querySelector('a-cursor');
        cursor.parentNode.removeChild(cursor);
        scope.el.parentNode.removeChild(scope.el);
      });
    }
  });


  AFRAME.registerComponent('start-button', {
    schema: {
      texture: {
        type: 'string'
      },
    },
    init: function () {
      let data = this.data;
      let camera = this.el.sceneEl.querySelector('#mainCamRig').object3D;
      camera.el.removeAttribute('geometry');
      camera.el.querySelector('#mainCam').setAttribute('wasd-controls', 'enabled:true');
      let position = camera.el.querySelector('#mainCam').object3D.getWorldPosition().clone();
      let direction = camera.getWorldDirection().clone();
      direction.multiplyScalar(-1.2);
      position.add(direction);
      this.video = document.createElement('video');
      this.video.id = 'start-video';
      this.video.crossOrigin = 'anonymous';
      this.video.setAttribute('crossorigin', 'anonymous');
      this.video.setAttribute('webkit-playsinline', 'webkit-playsinline');
      this.video.setAttribute('playsinline', 'playsinline');
      this.video.loop = true;
      this.video.src = data.texture;
      this.video.load();
      this.video.play();
      this.videoTexture = new THREE.VideoTexture(this.video);
      this.videoTexture.minFilter = THREE.NearestFilter;
      this.videoTexture.magFilter = THREE.LinearFilter;
      this.videoTexture.format = THREE.RGBFormat;
      this.videoTexture.generateMipmaps = false;
      position.y -= 0.3;
      this.el.setAttribute('position', position);
      let camPos = camera.el.querySelector('#mainCam').object3D.getWorldPosition();
      this.el.object3D.lookAt(camPos);
      //let spriteMap = new THREE.TextureLoader().load(data.texture);
      // video
      this.meshMaterial = new THREE.MeshBasicMaterial({
        map: this.videoTexture
      });

      this.geometry = new THREE.PlaneGeometry(1, 1, 1);
      this.mesh = new THREE.Mesh(this.geometry, this.meshMaterial);
      this.mesh.scale.set(0.5, 0.25, 1);
      this.el.setObject3D('mesh', this.mesh);

      this.el.setAttribute('start-cursor-listener', '');
    }
  });

  AFRAME.registerComponent('aframe-depthkit', {
    schema: {
      // type: {type: 'string', default: 'mesh'}, -> 
      videoPath: {
        type: 'string'
      },
      metaPath: {
        type: 'string'
      },
      loop: {
        type: 'boolean',
        default: false
      },
      autoplay: {
        type: 'boolean',
        default: false
      },
      opacity: {
        type: 'number',
        default: 1
      },
      volume: {
        type: 'number',
        default: 1
      },
      meshScalar: {
        type: 'number',
        default: 4.0
      }

    },
    init: function () {
      this.character = new Depthkit();
      this.depthkitLoaded = false;

      //--
      let scope = this;
      let data = this.data;
      let el = this.el;

      let geometry = new THREE.BoxGeometry(1, 1, 1);
      // geometry.vertices.push(
      //     new THREE.Vector3( -10,  10, 0 ),
      //     new THREE.Vector3( -10, -10, 0 ),
      //     new THREE.Vector3(  10, -10, 0 )
      // );
      //geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );


      //geometry.computeBoundingBox();
      let material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        opacity: 0.0
      });
      material.transparent = true;
      material.depthWrite = false;
      //geometry.boundingBox =new THREE.Box3(new THREE.Vector3( -10, -10, -10 ),new THREE.Vector3( 10,10,10));
      //geometry.boundingSphere =new THREE.Sphere(new THREE.Vector3(0,0,0),3);
      let cube = new THREE.Mesh(geometry, material);

      el.setObject3D('mesh', cube);
    

      //this.character.setMeshScalar(data.meshScalar);

      if (data.videoPath && data.metaPath) {
        // this.character.load(data.metaPath, data.videoPath, depthkitLoaded);
        const encodedMetaPath = encodeURI(data.metaPath);
        const encodedVideoPath = encodeURI(data.videoPath);
        this.character.load(encodedMetaPath, encodedVideoPath, depthkitLoaded);

        //this.character.el = el;
        cube.add(this.character);
        //el.setObject3D('mesh',this.character);
        //console.log('characterMEsh',this.character);
        //this.character.computeBoundingBox();
      }

      function depthkitLoaded() {
        scope.depthkitLoaded = true;
        scope.character.setOpacity(data.opacity);
        scope.character.setVolume(data.volume);
        if (data.autoplay) {
          scope.character.video.muted = "muted";
          scope.character.play();
        } else {
          scope.character.stop();
        }
        scope.character.setMeshScalar(data.meshScalar);
      }
    },
    update: function (previousData) {
      //Optimise: Check for the change in the new updated data as compared to the previous data
      let data = this.data;
      let character = this.character;
      if (this.depthkitLoaded) {

        if (data.autoplay) {
          character.play();
        } else {
          character.stop();
        }

        character.setLoop(data.loop);
        character.setOpacity(data.opacity);
        character.setVolume(data.volume);
        character.setMeshScalar(data.meshScalar);
      }
    },
    remove: function () {
      this.el.object3D.remove(this.character);
      //this.character.dispose(); //-> Do I need this?
    },
  });
}