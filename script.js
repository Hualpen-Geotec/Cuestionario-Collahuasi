// CONFIG
const RUT_URL = "https://script.google.com/macros/s/AKfycbzvjsK77j6Fm3j3fcNsSWQwWf9F8ZLwuZzJ4IrkumTzSKLSJskOxfUc_OzlfgNii2FG5g/exec";
const PREGUNTAS_URL = "https://script.google.com/macros/s/AKfycbwpZHA5cfKCoyvFBfeeZAPUZ4SqMX3MhmpcdkPPhNrk0gFwpBoewz5Y8VoWFsZNs2qM/exec";
const ENVIO_URL = "https://script.google.com/macros/s/AKfycbxbGCPrz9NOkROOFOT1ffkwGskzRngk7R4UEIBMq3-vzuEbq0K_B6QMnV9Q7NafgvwBZA/exec";

document.addEventListener("DOMContentLoaded", () => {
  // INDEX
  const rutInput = document.getElementById("rut");
  const nombreInput = document.getElementById("nombreInput");
  const correoInput = document.getElementById("correoInput");
  const mensaje = document.getElementById("mensaje");
  const datosUsuario = document.getElementById("datosUsuario");
  const buscarRutBtn = document.getElementById("buscarRutBtn");
  const continuarBtn = document.getElementById("continuarBtn");

  if (rutInput && buscarRutBtn && continuarBtn) {
    rutInput.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "");
    });

    buscarRutBtn.addEventListener("click", async () => {
      const rutIngresado = rutInput.value.trim();
      mensaje.textContent = "";

      if (rutIngresado.length < 7) {
        mensaje.textContent = "Por favor, ingresa un RUT válido.";
        return;
      }

      try {
        const res = await fetch(`${RUT_URL}?rut=${rutIngresado}`);
        const data = await res.json();

        if (data.autorizado) {
          nombreInput.value = data.nombre || "";
          correoInput.value = data.correo || "";
          datosUsuario.style.display = "block";
        } else {
          mensaje.textContent = "Este RUT no está autorizado para realizar el cuestionario.";
        }
      } catch (err) {
        mensaje.textContent = "Error al validar el RUT.";
      }
    });

    continuarBtn.addEventListener("click", () => {
      const rut = rutInput.value.trim();
      const nombre = nombreInput.value.trim();
      const correo = correoInput.value.trim();

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
  const formularioPreguntas = document.getElementById("formularioPreguntas");

  if (formularioPreguntas) {
    const rut = localStorage.getItem("rut");
    const nombre = localStorage.getItem("nombre");
    const correo = localStorage.getItem("correo");

    if (!rut || !nombre || !correo) {
      alert("Debes ingresar desde la página principal.");
      window.location.href = "index.html";
      return;
    }

    fetch(PREGUNTAS_URL)
      .then(res => res.json())
      .then(data => mostrarPreguntas(data))
      .catch(err => {
        formularioPreguntas.innerHTML = "<p style='color: red;'>Error cargando preguntas.</p>";
        console.error(err);
      });

    function mostrarPreguntas(preguntas) {
      if (!preguntas || preguntas.length === 0) {
        formularioPreguntas.innerHTML = "<p style='color: red;'>No se pudieron cargar preguntas.</p>";
        return;
      }

      preguntas.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "pregunta";
        div.innerHTML = `
          <p><strong>${i + 1}. ${p.pregunta}</strong></p>
          ${p.alternativas.map((alt, idx) => `
            <label>
              <input type="radio" name="pregunta${i}" value="${alt}" required />
              ${String.fromCharCode(65 + idx)}. ${alt}
            </label>
          `).join("")}
        `;
        formularioPreguntas.appendChild(div);
      });

      const boton = document.createElement("button");
      boton.type = "submit";
      boton.textContent = "Ver Resultados";
      formularioPreguntas.appendChild(boton);

      formularioPreguntas.addEventListener("submit", e => procesarRespuestas(e, preguntas));
    }

    function procesarRespuestas(e, preguntas) {
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

        document.getElementsByName(`pregunta${i}`).forEach(r => {
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
        body: JSON.stringify({ rut, nombre, correo, nota: porcentaje, errores: erroresPorFuente }),
        headers: { "Content-Type": "application/json" }
      }).catch(err => {
        alert("Error al guardar los resultados.");
        console.error(err);
      });

      document.getElementById("resultados").style.display = "block";
    }

    document.getElementById("nuevoIntento").addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }
});
