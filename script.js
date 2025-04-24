
const API_URL = "https://script.google.com/macros/s/AKfycbx02jQvdy-INCR05Oro2gcp_Drfrw9avm5OOuij93vQzCygqzFw8gKxFVIQ8KlEgpzfiw/exec";

document.getElementById('registroForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value;
  const rut = document.getElementById('rut').value;
  const correo = document.getElementById('correo').value;

  validarRUT(rut).then((autorizado) => {
    if (autorizado) {
      obtenerPreguntas().then((preguntas) => {
        mostrarPreguntas(preguntas, nombre, rut, correo);
      });
    } else {
      // Mostrar solicitud ingreso
      document.getElementById('solicitudIngreso').style.display = 'block';
      document.getElementById('rutSolicitud').value = rut;
    }
  });
});

function validarRUT(rut) {
  return fetch(`${API_URL}?action=validarRUT&rut=${encodeURIComponent(rut)}`, { method: "POST" })
    .then(res => res.json())
    .then(data => {
      if (!data.autorizado) {
        alert(data.mensaje);
      }
      return data.autorizado;
    });
}

function obtenerPreguntas() {
  return fetch(`${API_URL}?action=obtenerPreguntas`, { method: "POST" })
    .then(res => res.json());
}

function guardarResultado(nombre, rut, correo, puntaje) {
  return fetch(`${API_URL}?action=guardarResultado&nombre=${encodeURIComponent(nombre)}&rut=${encodeURIComponent(rut)}&correo=${encodeURIComponent(correo)}&puntaje=${puntaje}`, {
    method: "POST"
  });
}

function mostrarPreguntas(data, nombre, rut, correo) {
  const contenedor = document.getElementById('cuestionario');
  contenedor.style.display = 'block';
  contenedor.innerHTML = '<form id="quizForm"></form>';

  const form = document.getElementById('quizForm');
  let index = 0;

  data.alternativas.forEach(p => {
    form.innerHTML += `
      <div>
        <p><strong>${p[1]}</strong></p>
        ${['A', 'B', 'C', 'D'].map((letra, i) => `
          <label><input type="radio" name="q${index}" value="${letra}"> ${letra}) ${p[2 + i]}</label><br>
        `).join('')}
        <input type="hidden" name="correct${index}" value="${p[6]}">
      </div><br>
    `;
    index++;
  });

  data.vf.forEach(p => {
    form.innerHTML += `
      <div>
        <p><strong>${p[1]}</strong></p>
        <label><input type="radio" name="q${index}" value="V"> Verdadero</label>
        <label><input type="radio" name="q${index}" value="F"> Falso</label>
        <input type="hidden" name="correct${index}" value="${p[6]}">
      </div><br>
    `;
    index++;
  });

  form.innerHTML += `<button type="submit">Ver Resultados</button>`;

  form.addEventListener('submit', function(e) {
    function normalizar(valor) {
      if (!valor) return "";
      const v = valor.toString().trim().toUpperCase();
      if (v === "V" || v === "VERDADERO") return "VERDADERO";
      if (v === "F" || v === "FALSO") return "FALSO";
      return v;
    }

    e.preventDefault();
    let correctas = 0;
    const total = index;
    let respuestasIncorrectas = '';

    for (let i = 0; i < total; i++) {
      const seleccionada = form.querySelector(`input[name="q${i}"]:checked`);
      const correcta = form.querySelector(`input[name="correct${i}"]`).value;

      if (seleccionada && normalizar(seleccionada.value) === normalizar(correcta)) {
        correctas++;
      } else {
        const preguntaTexto = form.querySelectorAll('div')[i].querySelector('p strong').innerText;
        let detalleUsuario = seleccionada ? seleccionada.nextSibling.textContent.trim() : 'Sin responder';
        let detalleCorrecta = '';

        if (seleccionada && seleccionada.value.match(/[A-D]/)) {
          const opciones = form.querySelectorAll(`input[name="q${i}"]`);
          const opcionCorrecta = Array.from(opciones).find(opt => opt.value === correcta);
          if (opcionCorrecta) {
            detalleCorrecta = opcionCorrecta.nextSibling.textContent.trim();
          }
        } else {
          detalleUsuario = normalizar(detalleUsuario);
          detalleCorrecta = normalizar(correcta);
        }

        respuestasIncorrectas += `<div style="margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
          <strong style="display:block; margin-bottom: 5px;">Pregunta ${i + 1}:</strong>
          <div style="margin-left: 10px;">
            <div><strong>Texto:</strong> ${preguntaTexto}</div>
            <div><span style="color:red;"><strong>Incorrecta. Elegiste:</strong> ${detalleUsuario}</span></div>
            <div><span style="color:green;"><strong>Correcta:</strong> ${detalleCorrecta}</span></div>
          </div>
        </div>`;
      }
    }

    const puntaje = Math.round((correctas / total) * 100);
    guardarResultado(nombre, rut, correo, puntaje).then(() => {
      contenedor.innerHTML = `
        <h2>Resultado Final: ${puntaje}%</h2>
        ${respuestasIncorrectas}
        <button onclick="location.reload()">Nuevo Intento</button>
      `;
    });
  });
}

document.getElementById('formSolicitud').addEventListener('submit', function(e) {
  e.preventDefault();
  const nombre = document.getElementById('nombreSolicitud').value;
  const rut = document.getElementById('rutSolicitud').value;
  const correo = document.getElementById('correoSolicitud').value;

  fetch(`${API_URL}?action=registrarSolicitud`, {
    method: "POST",
    body: JSON.stringify({ nombre, rut, correo }),
    headers: { "Content-Type": "application/json" }
  })
  .then(res => res.text())
  .then(msg => {
    alert("Solicitud enviada. Tu supervisor revisará tu caso.");
    document.getElementById('solicitudIngreso').style.display = 'none';
  })
  .catch(err => {
    alert("Error al enviar la solicitud.");
    console.error(err);
  });
});
