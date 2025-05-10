// CONFIGURACIÓN DE URLS
const RUT_URL = "https://script.google.com/macros/s/AKfycbzvjsK77j6Fm3j3fcNsSWQwWf9F8ZLwuZzJ4IrkumTzSKLSJskOxfUc_OzlfgNii2FG5g/exec";
const PREGUNTAS_URL = "https://script.google.com/macros/s/AKfycbxBMbqYIO7KDTWHDFAP3Jzh8EH-mviRV0VeW6P-NX52NIfmx16MtpHQbAvjI7U_kZeK/exec";
const ENVIO_URL = "https://script.google.com/macros/s/AKfycby6Kd52wtnq71OsQgzuE9rWseu8VlaORZyI1Gq3jRLm2H3gjxQTilU-rQlFZkWZeubSnQ/exec";

document.addEventListener("DOMContentLoaded", () => {
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
        console.error("Error cargando preguntas:", err);
      });

    function mostrarPreguntas(preguntas) {
      formularioPreguntas.innerHTML = "";
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
      const preguntasErroneas = [];

      preguntas.forEach((p, i) => {
        const seleccionada = document.querySelector(`input[name="pregunta${i}"]:checked`).value;
        const esCorrecta = seleccionada === p.correcta;

        if (esCorrecta) {
          correctas++;
        } else {
          erroresPorFuente[p.fuente] = (erroresPorFuente[p.fuente] || 0) + 1;
          preguntasErroneas.push({
            pregunta: p.pregunta,
            seleccionada,
            correcta: p.correcta,
            alternativas: p.alternativas
          });
        }

        document.getElementsByName(`pregunta${i}`).forEach(r => r.disabled = true);
      });

      const porcentaje = Math.round((correctas / preguntas.length) * 100);
      const porcentajeEl = document.getElementById("porcentaje");
      porcentajeEl.textContent = `Tu puntaje es: ${porcentaje}%`;
      porcentajeEl.style.color = porcentaje >= 85 ? "green" : "red";

      // Mostrar solo preguntas incorrectas
      const resumen = document.getElementById("resumenErrores");
      resumen.innerHTML = preguntasErroneas.map((p, i) => {
        return `
          <div class="pregunta-error">
            <p><strong>${i + 1}. ${p.pregunta}</strong></p>
            <ul>
              ${p.alternativas.map(alt => {
                if (alt === p.correcta) {
                  return `<li style="color:green;"><strong>✓ ${alt}</strong> (correcta)</li>`;
                } else if (alt === p.seleccionada) {
                  return `<li style="color:red;"><strong>✗ ${alt}</strong> (tu respuesta)</li>`;
                } else {
                  return `<li>${alt}</li>`;
                }
              }).join("")}
            </ul>
          </div>
        `;
      }).join("");

      // Enviar resultados por GET
      const params = new URLSearchParams({
        rut,
        nombre,
        correo,
        nota: porcentaje,
        errores: JSON.stringify(erroresPorFuente)
      });

      fetch(`${ENVIO_URL}?${params.toString()}`)
        .then(res => res.text())
        .then(res => console.log("Resultado enviado:", res))
        .catch(err => {
          alert("Error al guardar los resultados.");
          console.error("Error al enviar resultados:", err);
        });

      document.getElementById("resultados").style.display = "block";
    }

    document.getElementById("nuevoIntento").addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }
});

