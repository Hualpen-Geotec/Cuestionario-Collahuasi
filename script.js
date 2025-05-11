// CONFIGURACIÓN DE URLS
const PREGUNTAS_URL = "https://script.google.com/macros/s/AKfycbxBMbqYIO7KDTWHDFAP3Jzh8EH-mviRV0VeW6P-NX52NIfmx16MtpHQbAvjI7U_kZeK/exec";
const ENVIO_URL = "https://script.google.com/macros/s/AKfycbzS-aHIfvUZa4-jNbusHW8UAdnp1tBknw6VkWOxuoR2EXE1P_xApTN5aEDWKgaIaOyYfQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const formularioPreguntas = document.getElementById("formularioPreguntas");

  if (!formularioPreguntas) return;

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

  function normalizarTexto(texto) {
    return texto
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

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
      const seleccionInput = document.querySelector(`input[name="pregunta${i}"]:checked`);
      const seleccionada = seleccionInput ? seleccionInput.value : "";
      const esCorrecta = normalizarTexto(seleccionada) === normalizarTexto(p.correcta);

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

      document.getElementsByName(`pregunta${i}`).forEach(r => {
        r.disabled = true;
        if (normalizarTexto(r.value) === normalizarTexto(p.correcta)) {
          r.parentElement.style.color = "green";
        }
        if (r.checked && !esCorrecta) {
          r.parentElement.style.color = "red";
        }
      });
    });

    const porcentaje = Math.round((correctas / preguntas.length) * 100);
    const porcentajeEl = document.getElementById("porcentaje");
    porcentajeEl.textContent = `Tu puntaje es: ${porcentaje}%`;
    porcentajeEl.style.color = porcentaje >= 85 ? "green" : "red";

    // Mostrar resumen de errores
    const resumen = document.getElementById("resumenErrores");
    resumen.innerHTML = preguntasErroneas.map((p, i) => {
      return `
        <div class="pregunta-error">
          <p><strong>${i + 1}. ${p.pregunta}</strong></p>
          <ul>
            ${p.alternativas.map(alt => {
              if (normalizarTexto(alt) === normalizarTexto(p.correcta)) {
                return `<li style="color:green;"><strong>✓ ${alt}</strong> (correcta)</li>`;
              } else if (normalizarTexto(alt) === normalizarTexto(p.seleccionada)) {
                return `<li style="color:red;"><strong>✗ ${alt}</strong> (tu respuesta)</li>`;
              } else {
                return `<li>${alt}</li>`;
              }
            }).join("")}
          </ul>
        </div>
      `;
    }).join("");

    // Enviar resultados al servidor
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
    window.location.reload();
  });
});
