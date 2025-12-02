async function send() {
  const E = document.getElementById("energy").value;
  const res = await fetch(`http://localhost:8000/api/packet?E=${E}`);
  const data = await res.json();
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
}
