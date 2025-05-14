// CONFIGURACIÓN DE URLS
const PREGUNTAS_URL = "https://script.google.com/macros/s/AKfycbxBMbqYIO7KDTWHDFAP3Jzh8EH-mviRV0VeW6P-NX52NIfmx16MtpHQbAvjI7U_kZeK/exec";
const ENVIO_URL = "https://script.google.com/macros/s/AKfycbzS-aHIfvUZa4-jNbusHW8UAdnp1tBknw6VkWOxuoR2EXE1P_xApTN5aEDWKgaIaOyYfQ/exec";

document.addEventListener("DOMContentLoaded", () => {
  const formularioPreguntas = document.getElementById("formularioPreguntas");
  const resultadosDiv = document.getElementById("resultados");
  const porcentajeEl = document.getElementById("porcentaje");
  const resumen = document.getElementById("resumenErrores");

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
    .then(data => iniciarCuestionario(data))
    .catch(err => {
      formularioPreguntas.innerHTML = "<p style='color: red;'>Error cargando preguntas.</p>";
      console.error("Error cargando preguntas:", err);
    });

  function normalizarTexto(texto) {
    return (texto || "").toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
  }

  function iniciarCuestionario(preguntas) {
    let indice = 0;
    const respuestas = new Array(preguntas.length).fill(null);

    function renderPregunta(i) {
      formularioPreguntas.innerHTML = "";
      const p = preguntas[i];
      const div = document.createElement("div");
      div.className = "pregunta";
      div.innerHTML = `<p><strong>${i + 1}. ${p.pregunta}</strong></p>`;

      p.alternativas.forEach((alt, idx) => {
        const altDiv = document.createElement("div");
        altDiv.style.margin = "12px 0";
        altDiv.innerHTML = `
          <label style="display:flex; align-items:center;">
            <input type="radio" name="pregunta" value="${alt}" ${respuestas[i] === alt ? "checked" : ""} />
            <span style="margin-left: 12px">${alt}</span>
          </label>`;
        div.appendChild(altDiv);
      });

      const mensajeError = document.createElement("p");
      mensajeError.style.color = "red";
      mensajeError.style.display = "none";
      mensajeError.id = "mensajeError";
      mensajeError.textContent = "Seleccione una alternativa para continuar";
      div.appendChild(mensajeError);

      const botonesDiv = document.createElement("div");
      botonesDiv.style.marginTop = "20px";

      if (i > 0) {
        const btnAtras = document.createElement("button");
        btnAtras.textContent = "Atrás";
        btnAtras.type = "button";
        btnAtras.onclick = () => renderPregunta(i - 1);
        botonesDiv.appendChild(btnAtras);
      }

      const btnSiguiente = document.createElement("button");
      btnSiguiente.textContent = i === preguntas.length - 1 ? "Finalizar" : "Siguiente";
      btnSiguiente.type = "button";
      btnSiguiente.style.marginLeft = "10px";
      btnSiguiente.onclick = () => {
        const seleccion = div.querySelector('input[name="pregunta"]:checked');
        if (!seleccion) {
          mensajeError.style.display = "block";
          return;
        }
        mensajeError.style.display = "none";
        respuestas[i] = seleccion.value;
        if (i === preguntas.length - 1) {
          procesarResultados();
        } else {
          renderPregunta(i + 1);
        }
      };
      botonesDiv.appendChild(btnSiguiente);

      div.appendChild(botonesDiv);
      formularioPreguntas.appendChild(div);
    }

    function procesarResultados() {
      let correctas = 0;
      const preguntasErroneas = [];
      const erroresPorFuente = {};

      preguntas.forEach((p, i) => {
        const respuestaUsuario = normalizarTexto(respuestas[i]);
        const respuestaCorrecta = normalizarTexto(p.correcta);
        if (respuestaUsuario === respuestaCorrecta) {
          correctas++;
        } else {
          const fuente = p.fuente || "Sin fuente";
          erroresPorFuente[fuente] = (erroresPorFuente[fuente] || 0) + 1;

          preguntasErroneas.push({
            pregunta: p.pregunta,
            seleccionada: respuestas[i],
            correcta: p.correcta,
            alternativas: p.alternativas,
            fuente: fuente
          });
        }
      });

      const porcentaje = Math.round((correctas / preguntas.length) * 100);
      formularioPreguntas.style.display = "none";
      resultadosDiv.style.display = "block";
      porcentajeEl.innerHTML = porcentaje === 100
        ? `<span style='font-size: 2em; color: green;'>${porcentaje}%<br>FELICITACIONES, LO LOGRASTE!!<br><em>(Inténtalo de nuevo y pruébame que no fue sólo suerte...)</em></span>`
        : `<span style='color: ${porcentaje >= 85 ? "green" : "red"};'>Tu puntaje es: ${porcentaje}%</span>`;

      resumen.innerHTML = preguntasErroneas.map((p, i) => `
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
      `).join("");

      const datosParaEnviar = {
        rut,
        nombre,
        correo,
        nota: porcentaje,
        erroresPorFuente
      };

      fetch(ENVIO_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datosParaEnviar)
      })
      .then(res => res.json())
      .then(data => console.log("Resultado enviado:", data))
      .catch(err => console.error("Error al enviar resultado:", err));
    }

    renderPregunta(indice);
  }

  const nuevoIntentoBtn = document.getElementById("nuevoIntento");
  if (nuevoIntentoBtn) {
    nuevoIntentoBtn.addEventListener("click", () => window.location.reload());
  }
});
