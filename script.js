// CONFIG
const RUT_URL = "https://script.google.com/macros/s/AKfycbzvjsK77j6Fm3j3fcNsSWQwWf9F8ZLwuZzJ4IrkumTzSKLSJskOxfUc_OzlfgNii2FG5g/exec";
const PREGUNTAS_URL = "https://script.google.com/macros/s/AKfycbwpZHA5cfKCoyvFBfeeZAPUZ4SqMX3MhmpcdkPPhNrk0gFwpBoewz5Y8VoWFsZNs2qM/exec";
const ENVIO_URL = "https://script.google.com/macros/s/AKfycbzvfNfY1QHKC755FEcbvpPf0tTZcK9DcHjoqGQpKtF8qwf-St88-zulfiVKD2ixNryhqA/exec";

// INDEX
if (document.getElementById("registroForm")) {
  document.getElementById("rut").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");
  });

  document.getElementById("rut").addEventListener("blur", async function () {
    const rutIngresado = this.value.trim();
    const mensaje = document.getElementById("mensaje");
    mensaje.textContent = "";

    if (rutIngresado.length < 7) {
      mensaje.textContent = "Por favor, ingresa un RUT válido.";
      return;
    }

    try {
      const res = await fetch(`${RUT_URL}?rut=${rutIngresado}`);
      const data = await res.json();

      if (data.autorizado) {
        document.getElementById("nombreInput").value = data.nombre || "";
        document.getElementById("correoInput").value = data.correo || "";
        document.getElementById("datosUsuario").style.display = "block";
      } else {
        mensaje.textContent = "Este RUT no está autorizado para realizar el cuestionario.";
      }
    } catch (err) {
      mensaje.textContent = "Error al validar el RUT.";
    }
  });

  document.getElementById("continuarBtn").addEventListener("click", () => {
    const rut = document.getElementById("rut").value.trim();
    const nombre = document.getElementById("nombreInput").value.trim();
    const correo = document.getElementById("correoInput").value.trim();

    if (!rut || !nombre || !correo) {
      alert("Por favor, completa todos los datos.");
      return;
    }

    localStorage.setItem("rut", rut);
    localStorage.setItem("nombre", nombre);
    localStorage.setItem("correo", correo);

    window.location.href = "forms.html";
  });
}

// FORMS
if (document.getElementById("formularioPreguntas")) {
  let preguntas = [];

  window.addEventListener("DOMContentLoaded", async () => {
    const rut = localStorage.getItem("rut");
    const nombre = localStorage.getItem("nombre");
    const correo = localStorage.getItem("correo");

    if (!rut || !nombre || !correo) {
      alert("Debes ingresar desde la página principal.");
      window.location.href = "index.html";
      return;
    }

    const res = await fetch(PREGUNTAS_URL);
    preguntas = await res.json();
    mostrarPreguntas();
  });

  function mostrarPreguntas() {
    const form = document.getElementById("formularioPreguntas");
    preguntas.forEach((p, i) => {
      const bloque = document.createElement("div");
      bloque.classList.add("pregunta");

      bloque.innerHTML = `<p><strong>${i + 1}. ${p.pregunta}</strong></p>` +
        p.alternativas.map((alt, idx) => `
          <label>
            <input type="radio" name="pregunta${i}" value="${alt}" required />
            ${String.fromCharCode(65 + idx)}. ${alt}
          </label>
        `).join("") +
        `<br><br>`;

      form.appendChild(bloque);
    });

    const boton = document.createElement("button");
    boton.type = "submit";
    boton.textContent = "Ver Resultados";
    form.appendChild(boton);

    form.addEventListener("submit", procesarRespuestas);
  }

  function procesarRespuestas(e) {
    e.preventDefault();
    let correctas = 0;
    const erroresPorFuente = {};

    preguntas.forEach((p, i) => {
      const respuesta = document.querySelector(`input[name="pregunta${i}"]:checked`).value;
      const esCorrecta = respuesta === p.correcta;

      if (esCorrecta) {
        correctas++;
      } else {
        erroresPorFuente[p.fuente] = (erroresPorFuente[p.fuente] || 0) + 1;
      }

      const radios = document.getElementsByName(`pregunta${i}`);
      radios.forEach(r => {
        r.disabled = true;
        if (r.value === p.correcta) r.parentElement.style.color = "green";
        if (r.value === respuesta && respuesta !== p.correcta) r.parentElement.style.color = "red";
      });
    });

    const porcentaje = Math.round((correctas / preguntas.length) * 100);
    document.getElementById("porcentaje").textContent = `Tu puntaje es: ${porcentaje}%`;

    const resumen = Object.entries(erroresPorFuente).map(
      ([clave, valor]) => `<p>${clave}: ${valor} errores</p>`
    ).join("");
    document.getElementById("resumenErrores").innerHTML = resumen;

    fetch(ENVIO_URL, {
      method: "POST",
      body: JSON.stringify({
        rut: localStorage.getItem("rut"),
        nombre: localStorage.getItem("nombre"),
        correo: localStorage.getItem("correo"),
        nota: porcentaje,
        errores: erroresPorFuente
      }),
      headers: { "Content-Type": "application/json" }
    });

    document.getElementById("resultados").style.display = "block";
  }

  document.getElementById("nuevoIntento").addEventListener("click", () => {
    localStorage.removeItem("rut");
    localStorage.removeItem("nombre");
    localStorage.removeItem("correo");
    window.location.href = "index.html";
  });
}
