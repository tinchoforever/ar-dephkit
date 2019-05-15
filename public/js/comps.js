
///Click and drag

const TIME_TO_KEEP_LOG = 100;

function forceWorldUpdate(threeElement) {

  let element = threeElement;
  while (element.parent) {
    element = element.parent;
  }

  element.updateMatrixWorld(true);
}

function forEachParent(element, lambda) {
  while (element.attachedToParent) {
    element = element.parentElement;
    lambda(element);
  }
}

function someParent(element, lambda) {
  while (element.attachedToParent) {
    element = element.parentElement;
    if (lambda(element)) {
      return true;
    }
  }
  return false;
}

function cameraPositionToVec3(camera, vec3) {

  // vec3.set(
  //   camera.components.position.data.x,
  //   camera.components.position.data.y,
  //   camera.components.position.data.z
  // );

    vec3.set(
    camera.components.camera.camera.position.x,
    camera.components.camera.camera.position.y,
    camera.components.camera.camera.position.z
  );


    vec3.set(
        vec3.x + camera.components.position.data.x,
        vec3.y + camera.components.position.data.y,
        vec3.z + camera.components.position.data.z
      );

    
  forEachParent(camera, element => {

    if (element.components && element.components.position) {
      vec3.set(
        vec3.x + element.components.position.data.x,
        vec3.y + element.components.position.data.y,
        vec3.z + element.components.position.data.z
      );
    }

  });
 

}

function localToWorld(THREE, threeCamera, vector) {
  forceWorldUpdate(threeCamera);
  return  threeCamera.localToWorld(vector);
}

const {unproject} = (function unprojectFunction() {

  let initialized = false;

  let matrix;

  function initialize(THREE) {
    matrix = new THREE.Matrix4();

    return true;
  }

  return {

    unproject(THREE, vector, camera) {

      
      const threeCamera = camera.components.camera.camera;
      
      initialized = initialized || initialize(THREE);

      // vector.applyProjection(matrix.getInverse(threeCamera.projectionMatrix));
      vector.applyMatrix4(matrix.getInverse(threeCamera.projectionMatrix));
      // applyProjection(matrix.getInverse(threeCamera.projectionMatrix));

      return localToWorld(THREE, threeCamera, vector);

    },
  };
}());

function clientCoordsTo3DCanvasCoords(
  clientX,
  clientY,
  offsetX,
  offsetY,
  clientWidth,
  clientHeight) {


    return {
    x: (((clientX - offsetX) / clientWidth) * 2) - 1,
    y: (-((clientY - offsetY) / clientHeight) * 2) + 1,
  };
}

const {screenCoordsToDirection} = (function screenCoordsToDirectionFunction() {

  let initialized = false;

  let mousePosAsVec3;
  let cameraPosAsVec3;

  function initialize(THREE) {
    mousePosAsVec3 = new THREE.Vector3();
    cameraPosAsVec3 = new THREE.Vector3();

    return true;
  }

  return {
    screenCoordsToDirection(
      THREE,
      aframeCamera,
      {x: clientX, y: clientY}
    ) {

      initialized = initialized || initialize(THREE);
      let canvasPosition = document.querySelector('canvas').getBoundingClientRect();
      // scale mouse coordinates down to -1 <-> +1
      const {x: mouseX, y: mouseY} = clientCoordsTo3DCanvasCoords(
        clientX, clientY,
        canvasPosition.x, canvasPosition.y, // TODO: Replace with canvas position
        canvasPosition.width,
        canvasPosition.height
      );

      mousePosAsVec3.set(mouseX, mouseY, -1);
      const projectedVector = unproject(THREE, mousePosAsVec3, aframeCamera);
      cameraPositionToVec3(aframeCamera, cameraPosAsVec3);
      // Get the unit length direction vector from the camera's position
      const {x, y, z} = projectedVector.sub(cameraPosAsVec3).normalize();
      return {x, y, z};
    },
  };
}());

/**
 * @param planeNormal {THREE.Vector3}
 * @param planeConstant {Float} Distance from origin of the plane
 * @param rayDirection {THREE.Vector3} Direction of ray from the origin
 *
 * @return {THREE.Vector3} The intersection point of the ray and plane
 */
function rayPlaneIntersection(planeNormal, planeConstant, rayDirection) {
  // A line from the camera position toward (and through) the plane
  const distanceToPlane = planeConstant / planeNormal.dot(rayDirection);
  return rayDirection.multiplyScalar(distanceToPlane);
}

const {directionToWorldCoords} = (function directionToWorldCoordsFunction() {

  let initialized = false;

  let direction;
  let cameraPosAsVec3;

  function initialize(THREE) {
    direction = new THREE.Vector3();
    cameraPosAsVec3 = new THREE.Vector3();

    return true;
  }

  return {
    directionToWorldCoords(
      THREE,
      aframeCamera,
      camera,
      {x: directionX, y: directionY, z: directionZ},
      depth
    ) {
      initialized = initialized || initialize(THREE);
      cameraPositionToVec3(aframeCamera, cameraPosAsVec3);
      direction.set(directionX, directionY, directionZ);
      // A line from the camera position toward (and through) the plane
      const newPosition = rayPlaneIntersection(
        camera.getWorldDirection(),
        depth,
        direction
      );

      // Reposition back to the camera position
      const {x, y, z} = newPosition.add(cameraPosAsVec3);

      return {x, y, z};

    },
  };
}());

const {selectItem} = (function selectItemFunction() {

  let initialized = false;

  let cameraPosAsVec3;
  let directionAsVec3;
  let raycaster;
  let plane;

  function initialize(THREE) {
    plane = new THREE.Plane();
    cameraPosAsVec3 = new THREE.Vector3();
    directionAsVec3 = new THREE.Vector3();
    raycaster = new THREE.Raycaster();

    // TODO: From camera values?
    raycaster.far = Infinity;
    raycaster.near = 0;

    return true;
  }

  return {
    selectItem(THREE, selector, camera, clientX, clientY) {

      initialized = initialized || initialize(THREE);

      const {x: directionX, y: directionY, z: directionZ} = screenCoordsToDirection(
        THREE,
        camera,
        {x: clientX, y: clientY}
      );

      cameraPositionToVec3(camera, cameraPosAsVec3);
      directionAsVec3.set(directionX, directionY, directionZ);

      raycaster.set(cameraPosAsVec3, directionAsVec3);

      // Push meshes onto list of objects to intersect.
      // TODO: Can we do this at some other point instead of every time a ray is
      // cast? Is that a micro optimization?
      const objects = Array.from(
        camera.sceneEl.querySelectorAll(`[${selector}]`)
      ).map(object => object.object3D);

      const recursive = true;

      const intersected = raycaster
        .intersectObjects(objects, recursive)
        // Only keep intersections against objects that have a reference to an entity.
        .filter(intersection => !!intersection.object.el)
         // Only keep ones that are visible
         .filter(intersection => intersection.object.parent.visible)
        // The first element is the closest
        [0]; // eslint-disable-line no-unexpected-multiline

      if (!intersected) {
        return {};
      }

      const {point, object} = intersected;

      // Aligned to the world direction of the camera
      // At the specified intersection point
      plane.setFromNormalAndCoplanarPoint(
        camera.components.camera.camera.getWorldDirection().clone().negate(),
        point.clone().sub(cameraPosAsVec3)
      );

      const depth = plane.constant;

      const offset = point.sub(object.getWorldPosition());

      return {depth, offset, element: object.el};

    },
  };
}());



// Closure to close over the removal of the event listeners
const {didMount, didUnmount} = (function getDidMountAndUnmount() {

  let removeClickListeners;
  let removeDragListeners;
  const cache = [];

  function initialize(THREE, componentName) {

    const scene = document.querySelector('a-scene');
    let camera;
    let previousSelectedElement = null;
    let currentlySelectedElement = null;
    let axisHelperControl;
    let timeFlag = null;

    let mouseDownXY = null;
    let mouseUpXY = null;

    function addAxisHelper(element)
    {
        var mesh = element.object3D;
        axisHelperControl.attach(mesh);
        scene.object3D.add(axisHelperControl);
    }
    function removeAxisHelper(element)
    {
        var mesh = element.object3D;
        axisHelperControl.detach(mesh);
        scene.object3D.remove(axisHelperControl);
    }

    function onClick({clientX,clientY})
    {

       mouseUpXY = {x:clientX,y:clientY};
      const {depth, offset, element} = selectItem(THREE, componentName, camera, clientX, clientY);
      let dist = (mouseUpXY.x - mouseDownXY.x)*(mouseUpXY.x - mouseDownXY.x) + (mouseUpXY.y - mouseDownXY.y)*(mouseUpXY.y - mouseDownXY.y);
      // Check if it's a click or a drag. If drag then do not execute that function. 
      if(dist<=25) 
      {
        if(element)
        {
        
          currentlySelectedElement = element;
      
          scene.emit('entitySelectedByClick',element.id);
          //currentlySelectedElement.emit('entitySelected');
          //previousSelectedElement = element;
          //addAxisHelper(element);
          document.querySelector('#inspectorCam').setAttribute('orbit-controls','enabled',false);
        }
        else
        {        
          document.querySelector('#inspectorCam').setAttribute('orbit-controls','enabled',true);
        }
      }
      
    }

    function onDblClick({clientX,clientY})
    {
      const {depth, offset, element} = selectItem(THREE, componentName, camera, clientX, clientY);
      if(!element)
      {
        //removeAxisHelper(previousSelectedElement);
        scene.emit('null_selection');
      }
    }
    function onMouseDown({clientX,clientY})
    {
   
      mouseDownXY = {x:clientX,y:clientY}
      
    }
    function onTouchStart({changedTouches: [touchInfo]}) {
      onMouseDown(touchInfo);
    }

    function onTouchEnd({changedTouches: [touchInfo]}) {
      onMouseUp(touchInfo);
    }

    function run() {

      camera = scene.camera.el;
      axisHelperControl = new THREE.TransformControls(camera.getObject3D('camera'),camera.sceneEl.renderer.domElement);

      // TODO: Attach to canvas?
      document.querySelector('a-scene').addEventListener('click', onClick);
      document.querySelector('a-scene').addEventListener('mousedown', onMouseDown);
      document.querySelector('a-scene').addEventListener('dblclick', onDblClick);


      //Listening to any transform change in the the a-scene
      document.querySelector('a-scene').addEventListener('transformChagedInAScene', (evt) => {
              
              // On any transform change, this function keep tracks of the selected element
              // selected element will be emitting transform changed.
              currentlySelectedElement.emit('transformChaged');
         });  
     // document.querySelector('a-scene').addEventListener('mousedown', onMouseDown);

      //document.querySelector('a-scene').addEventListener('click',onClick);
      // document.addEventListener('touchstart', onTouchStart);
      // document.addEventListener('touchend', onTouchEnd);

    }

    if (scene.hasLoaded) {
      run();
    } else {
      scene.addEventListener('loaded', run);
    }

  }

  function tearDown() {
    removeClickListeners && removeClickListeners(); // eslint-disable-line no-unused-expressions
    removeClickListeners = undefined;
  }

  return {
    didMount(element, THREE, componentName) {
      
      if (cache.length === 0) {
        initialize(THREE, componentName);
      }

      if (cache.indexOf(element) === -1) {
        cache.push(element);
      }
    },

    didUnmount(element) {

      const cacheIndex = cache.indexOf(element);

      removeDragListeners && removeDragListeners(); // eslint-disable-line no-unused-expressions
      removeDragListeners = undefined;

      if (cacheIndex === -1) {
        return;
      }

      // remove that element
      cache.splice(cacheIndex, 1);

      if (cache.length === 0) {
        tearDown();
      }

    },
  };
}());

/**
 * @param aframe {Object} The Aframe instance to register with
 * @param componentName {String} The component name to use. Default: 'click-drag'
 */


  const THREE = this.THREE;
  const componentName = 'click-drag';
  /**
   * Draggable component for A-Frame.
   */
AFRAME.registerComponent('click-drag', {
    schema: {},

    /**
     * Called once when component is attached. Generally for initial setup.
     */
    init() {
      didMount(this, THREE, componentName);
    },

    /**
     * Called when component is attached and when component data changes.
     * Generally modifies the entity based on the data.
     *
     * @param oldData
     */
    update() { },

    /**
     * Called when a component is removed (e.g., via removeAttribute).
     * Generally undoes all modifications to the entity.
     */
    remove() {
      didUnmount(this);
    },

    /**
     * Called when entity pauses.
     * Use to stop or remove any dynamic or background behavior such as events.
     */
    pause() {
      didUnmount(this);
    },

    /**
     * Called when entity resumes.
     * Use to continue or add any dynamic or background behavior such as events.
     */
    play() {
      didMount(this, THREE, componentName);
    },
});

