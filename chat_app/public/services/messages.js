// Connect to the Socket.IO server
const socket = io('http://localhost:3001');

// -----  atLeastOnce logic
// const socket = io('http://localhost:3001', { 
//   auth: {
//     offset: undefined
//   }
// });

// Handle successful connection
socket.on("message", (messageData) => {
  console.log('MessageData from client', messageData);
  let [ msg, timestamp ] = messageData;

  socket.auth.offset = timestamp; // atLeastOnce logic
  console.log('Socket offset', socket.auth.offset)
  
  const item = document.createElement('li');
  item.textContent = msg["hi"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

socket.on("connect_message", (msg) => {
  // socket.auth.offset = timestamp; // w/o this update, user will always receive messages from a specific point in time on
  const item = document.createElement('li');
  item.textContent = msg["hi"];
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// session listener emitted upon user connecting for the first time
socket.on("session", ({ sessionId }) => {
  socket.auth = { sessionId };
  localStorage.setItem("sessionId", sessionId);
})

// ----- atLeastOnce server-side START ---------//


// Client
// const socket = io({
//   auth: {
//     offset: undefined
//   }
// });

// socket.on("my-event", ({ timestamp, data }) => {
//   // do something with the data, and then update the offset
//   socket.auth.offset = timestamp;
// });


// ----- atLeastOnce server-side END ---------//


// socket.on("message", (msg) => {
//   console.log(msg);
//   const item = document.createElement('li');
//   item.textContent = msg["hi"];
//   messages.appendChild(item);
//   window.scrollTo(0, document.body.scrollHeight);
// });

// // const form = document.getElementById('form');
// // const input = document.getElementById('input');
// const messages = document.getElementById('messages');

// // we don't need this if we are only concerned about the client receiving what is published by backend services
// the client does not need to send data

const disconnectBtn = document.getElementById('disconnect');
disconnectBtn.addEventListener('click', (e) => {
  e.preventDefault();
  socket.disconnect();
  console.log('client-side offset upon disconnect', socket.auth.offset)
  setTimeout(() => {
    socket.connect();
  }, 7000)
});

// socket.on("disconnect", (reason) => {
//   if (reason === "io server disconnect") {
//     // the disconnection was initiated by the server, you need to reconnect manually
//     socket.connect();
//   }
//   // else the socket will automatically try to reconnect
// });
