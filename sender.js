import "./style.css";
import javascriptLogo from "./javascript.svg";
import viteLogo from "/vite.svg";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ARButton } from "three/addons/webxr/ARButton.js";

// WebSocket-Connection
//const socket = new WebSocket("wss://localhost:8080/");
const socket = new WebSocket("wss://unity-stun-signaling.glitch.me/");

// WebRTC PeerConnection
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

socket.onopen = async () => {
  // ICE-Candidate exchange
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({ candidate: event.candidate }));
    }
  };

  // WebSocket-Message handling
  socket.onmessage = async (message) => {
    const text = await message.data.text();
    const data = JSON.parse(text);

    if (data.offer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.send(JSON.stringify({ answer: peerConnection.localDescription }));
    } else if (data.answer) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };
};

// Create Three.js szene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] }));

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -5);

// Add cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
cube.position.z = -5;
scene.add(cube);

const rotationSpeed = 0.5; // Winkel pro Sekunde (in Radianten)
const clock = new THREE.Clock();

const controller = renderer.xr.getController(0);
scene.add(controller);

// Add lighting
const hemiLight = new THREE.HemisphereLight(0x404040, 0xffffff, 0.5);
scene.add(hemiLight);

// Animation
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta(); // Zeit seit dem letzten Frame
  cube.rotation.x += rotationSpeed * delta; // X-Achsen-Rotation
  cube.rotation.y += rotationSpeed * delta; // Y-Achsen-Rotation

  controls.update();
  renderer.render(scene, camera);
}

// Change cube color on click
window.addEventListener("click", (event) => {
  const x = event.clientX / window.innerWidth;
  if (x < 0.33) {
    cube.material.color.set(0xff0000); // Red
  } else if (x < 0.66) {
    cube.material.color.set(0x00ff00); // Green
  } else {
    cube.material.color.set(0x0000ff); // Blue
  }
});

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.xr.addEventListener("sessionstart", () => {
  // Capture stream and add it as WebRTC track
  const stream = renderer.domElement.captureStream(30); // 30 FPS
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  // Create and send WebRTC offer
  peerConnection
    .createOffer()
    .then((offer) => {
      return peerConnection.setLocalDescription(offer);
    })
    .then(() => {
      socket.send(JSON.stringify({ offer: peerConnection.localDescription }));
    })
    .catch((error) => {
      console.error("Error creating the WebRTC offer:", error);
    });
});
