// document.body.style.cursor = 'none';

var MusicVisualyzer = function(audioId, yOffset) {
  var SEPARATION = 100, AMOUNTX = 32, AMOUNTY = 32;
  var audioSrc, audio;
  var ctx = new AudioContext();

  var analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  yOffset = yOffset || 0;
  
  var useMic = function() {
    navigator.mediaDevices.getUserMedia = (navigator.mediaDevices.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

    if (navigator.mediaDevices.getUserMedia)
      navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        audioSrc = ctx.createMediaStreamSource(stream);
        audioSrc.connect(analyser);
      })
  };

  var useClip = function() {
    audio = document.getElementById(audioId);
    audioSrc = ctx.createMediaElementSource(audio);
    audioSrc.connect(analyser);
    audioSrc.connect(ctx.destination);
  };

  if (!audioId) useMic();
  else useClip();

  // frequencyBinCount tells you how many values you'll receive from the analyser
  var frequencyData = new Uint8Array(analyser.frequencyBinCount);

  var particle, particles = new Array();

  var count = 0;

  var play = function() {
    audio.play();
  };

  var getData = function() {
    analyser.getByteFrequencyData(frequencyData);
    // render frame based on values in frequencyData

    count += 0.1;
  };

  var initParticles = function(scene) {
    var PI2 = Math.PI * 2;
    var i = 0;

    var program = function ( context ) {
      context.beginPath();
      context.arc( 0, 0, 0.5, 0, PI2, true );
      context.fill();
    };

    for ( var ix = 0; ix < AMOUNTX; ix ++ ) {

      for ( var iy = 0; iy < AMOUNTY; iy ++ ) {
        var material = new THREE.SpriteCanvasMaterial({
          color: 0xffffff,
          program: program
        });
        particle = particles[ i++ ] = new THREE.Sprite( material );
        particle.position.x = ix * SEPARATION - ( ( AMOUNTX * SEPARATION ) / 2 );
        particle.position.z = iy * SEPARATION - ( ( AMOUNTY * SEPARATION ) / 2 );
        scene.add( particle );
      }
    }
  }

  var updatePosition = function() {
    var i = 0;
    var fraction;

    for ( var ix = 0; ix < frequencyData[i]; ix ++ ) {

      for ( var iy = 0; iy < frequencyData[i]; iy ++ ) {

        particle = particles[ i++ ];

        particle.position.y =
          ( Math.sin( ( ix + count ) * 0.3 ) * 75 ) +
          ( Math.sin( ( iy + count ) * 0.5 ) * 75 );
        
        particle.scale.x = particle.scale.y = 
          ( Math.sin( ( ix + count ) * 0.3 ) + 1 ) * 4 +
          ( Math.sin( ( iy + count ) * 0.5 ) + 1 ) * 4;

        var useHueLines = false;
        if (useHueLines) {
          fraction = i / 255; // use continuous hue lines
        }
        else {
          fraction = frequencyData[i] / 255; // use altitude for determining color
        }

        // docs for changing colors here: https://threejs.org/docs/api/math/Color.html
        var color = new THREE.Color();
        color.setHSL( fraction, .64, .59 );

        particle.material.color = color;

        particle.position.y += yOffset;
      }
    }
  }

  var getFrequencyData = function() {
    return frequencyData;
  }

  return {
    play: play,
    getData: getData,
    initParticles: initParticles,
    updatePosition: updatePosition,
    getFrequencyData: getFrequencyData
  }
};

var aveMaria = MusicVisualyzer('aveMaria');
var bachCello = MusicVisualyzer('bachCello', 750);
var voiceNoodle = MusicVisualyzer(null, 1500);

$(function(){

  var container, stats;
  var camera, scene, renderer;

  var mouseX = 0, mouseY = 0;

  var windowHalfX = window.innerWidth / 2;
  var windowHalfY = window.innerHeight / 2;

  init();
  animate();
  aveMaria.play();
  bachCello.play();


  function init() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 1000;

    scene = new THREE.Scene();

    aveMaria.initParticles(scene);
    bachCello.initParticles(scene);
    voiceNoodle.initParticles(scene);

    renderer = new THREE.CanvasRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
    document.addEventListener( 'touchstart', onDocumentTouchStart, false );
    document.addEventListener( 'touchmove', onDocumentTouchMove, false );
    document.addEventListener( 'mousewheel', onScroll, false );

    window.addEventListener( 'resize', onWindowResize, false );

  }

  function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

  }

  //

  function onDocumentMouseMove( event ) {

    mouseX = event.clientX - windowHalfX;
    mouseY = event.clientY - windowHalfY;

  }

  function onDocumentTouchStart( event ) {

    if ( event.touches.length === 1 ) {

      event.preventDefault();

      mouseX = event.touches[ 0 ].pageX - windowHalfX;
      mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

  }

  function onDocumentTouchMove( event ) {

    if ( event.touches.length === 1 ) {

      event.preventDefault();

      mouseX = event.touches[ 0 ].pageX - windowHalfX;
      mouseY = event.touches[ 0 ].pageY - windowHalfY;

    }

  }

  function onScroll ( event ) {
    event.preventDefault();
    var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
    camera.position.z += delta * 100;
  }

  //

  function animate() {

    requestAnimationFrame( animate );

    render();
    stats.update();

  }
  var angle = 0,
    speed = aveMaria.getFrequencyData()[25]/100,
    centerY = 0,
    waveHeight = 60;

  function render() {
    angle += speed;
    var xOffset = mouseX - windowHalfX;
    var yOffset = mouseY - windowHalfY;
    camera.position.x += ( xOffset - camera.position.x ) * .05;
    camera.position.y += ( - yOffset - camera.position.y ) * .05;
    camera.position.x += mouseX * 0.6;
    camera.position.y += mouseY * 0.6;
    camera.lookAt( scene.position );

    aveMaria.updatePosition();
    bachCello.updatePosition();
    voiceNoodle.updatePosition();

    renderer.render( scene, camera );

    aveMaria.getData();
    bachCello.getData();
    voiceNoodle.getData();
  }
});
