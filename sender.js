import "./style.css";
import javascriptLogo from "./javascript.svg";
import viteLogo from "/vite.svg";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// WebSocket-Connection
const socket = new WebSocket("ws://localhost:8080");

// WebRTC PeerConnection
const peerConnection = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});

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
  if (data.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error("Error adding ICE-Candidate:", e);
    }
  }
};

// Create Three.js szene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

// Add cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;

// Add lighting
const hemiLight = new THREE.HemisphereLight(0x404040, 0xffffff, 0.5);
scene.add(hemiLight);

// Animation
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  controls.update();
  renderer.render(scene, camera);
}
animate();

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

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
