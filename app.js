const form = document.getElementById("formulario");
const statusEl = document.getElementById("status");
const horaRegistroEl = document.getElementById("horaRegistro");
const fotoArquivoEl = document.getElementById("fotoArquivo");
const fotoCameraEl = document.getElementById("fotoCamera");
const previewImagemEl = document.getElementById("previewImagem");

let imagemSelecionada = null;
let previewUrl = "";

function formatDateTime(date) {
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateClock() {
  horaRegistroEl.value = formatDateTime(new Date());
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type;
}

function clearImagePreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  previewImagemEl.src = "";
  previewImagemEl.classList.add("hidden");
  imagemSelecionada = null;
}

function setImage(file, sourceInput) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showStatus("Selecione um arquivo de imagem válido.", "error");
    sourceInput.value = "";
    return;
  }

  clearImagePreview();
  imagemSelecionada = file;
  previewUrl = URL.createObjectURL(file);
  previewImagemEl.src = previewUrl;
  previewImagemEl.classList.remove("hidden");

  if (sourceInput === fotoArquivoEl) {
    fotoCameraEl.value = "";
  } else {
    fotoArquivoEl.value = "";
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));

    reader.readAsDataURL(file);
  });
}

fotoArquivoEl.addEventListener("change", (event) => {
  setImage(event.target.files?.[0], fotoArquivoEl);
});

fotoCameraEl.addEventListener("change", (event) => {
  setImage(event.target.files?.[0], fotoCameraEl);
});

updateClock();
setInterval(updateClock, 1000);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    showStatus("Preencha todos os campos obrigatórios.", "error");
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const rua = (data.get("rua")?.toString().trim() || "").toUpperCase();
  const complemento = data.get("complemento")?.toString().trim() || "";
  const descricao = data.get("descricao")?.toString().trim() || "";
  const bairro = data.get("bairro")?.toString().trim() || "";
  const horaRegistro = horaRegistroEl.value;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de obra concluida.", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Bairro: ${bairro}`, 14, 76);
  doc.text(`Rua: ${rua}`, 14, 46);
  doc.text(`Complemento: ${complemento}`, 14, 56);
  doc.text(`Descricao: ${descricao}`, 14, 66);
  doc.text(`Hora do registro: ${horaRegistro}`, 14, 86);
  doc.text(`Imagem anexada: ${imagemSelecionada ? "Sim" : "Não"}`, 14, 96);

  if (imagemSelecionada) {
    try {
      const imageData = await readFileAsDataURL(imagemSelecionada);
      const imageType = imageData.includes("image/png") ? "PNG" : "JPEG";
      const imageProps = doc.getImageProperties(imageData);
      const maxWidth = 180;
      const maxHeight = 150;
      const scale = Math.min(maxWidth / imageProps.width, maxHeight / imageProps.height);
      const renderWidth = imageProps.width * scale;
      const renderHeight = imageProps.height * scale;

      let imageY = 106;
      if (imageY + renderHeight > 280) {
        doc.addPage();
        imageY = 20;
      }

      doc.addImage(imageData, imageType, 14, imageY, renderWidth, renderHeight);
    } catch (error) {
      showStatus("PDF gerado sem imagem: falha ao processar o arquivo.", "error");
    }
  }

  doc.save(`Relatorio_Obras_${bairro}.pdf`);
  if (!statusEl.classList.contains("error")) {
    showStatus("Relatório PDF gerado e download iniciado.", "ok");
  }
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearImagePreview();
    showStatus("", "");
    updateClock();
  }, 0);
});
