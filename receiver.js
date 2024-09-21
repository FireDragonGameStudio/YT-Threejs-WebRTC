// WebSocket connection
//const socket = new WebSocket("wss://localhost:8080/");
const socket = new WebSocket("wss://unity-stun-signaling.glitch.me/");

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

// Remote-Stream receiving
peerConnection.ontrack = (event) => {
  const remoteVideo = document.getElementById("remoteVideo");
  // if (remoteVideo.srcObject !== event.streams[0]) {
  remoteVideo.srcObject = event.streams[0];
  // }
};

// WebSocket-Message handling
socket.onmessage = async (message) => {
  try {
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
  } catch (e) {
    console.error("Error handling WebSocket-Message:", e);
  }
};
