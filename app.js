// ===============================
// ELEMENTOS DO DOM
// ===============================

const form = document.getElementById("formulario");
const statusEl = document.getElementById("status");
const horaRegistroEl = document.getElementById("horaRegistro");
const fotoArquivoEl = document.getElementById("fotoArquivo");
const fotoCameraEl = document.getElementById("fotoCamera");
const previewImagemEl = document.getElementById("previewImagem");
const btnShare = document.getElementById("btnShare");

// ===============================
// ESTADO
// ===============================

let imagemSelecionada = null;
let previewUrl = "";

// ===============================
// UTILITÁRIOS
// ===============================

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

function showStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = type;
}

function sanitizeFileName(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
}

// ===============================
// IMAGEM
// ===============================

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
  if (!file) return;

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
    reader.onerror = () => reject();
    reader.readAsDataURL(file);
  });
}

// ===============================
// GERAÇÃO DO PDF
// ===============================

async function gerarPDF() {
  if (!form.checkValidity()) {
    showStatus("Preencha todos os campos obrigatórios.", "error");
    form.reportValidity();
    return null;
  }

  const data = new FormData(form);

  const bairro = data.get("bairro")?.toString().trim() || "";
  const rua = (data.get("rua")?.toString().trim() || "").toUpperCase();
  const complemento = data.get("complemento")?.toString().trim() || "";
  const descricao = data.get("descricao")?.toString().trim() || "";
  const horaRegistro = horaRegistroEl.value;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Relatório de Obra Concluída ${bairro}`, 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);

  let y = 40;

  doc.text(`Bairro: ${bairro}`, 14, y); y += 10;
  doc.text(`Rua: ${rua}`, 14, y); y += 10;
  doc.text(`Complemento: ${complemento}`, 14, y); y += 10;
  doc.text(`Descrição: ${descricao}`, 14, y); y += 10;
  doc.text(`Hora do Registro: ${horaRegistro}`, 14, y); y += 10;

  doc.text(`Imagem anexada: ${imagemSelecionada ? "Sim" : "Não"}`, 14, y);
  y += 15;

  if (imagemSelecionada) {
    try {
      const imageData = await readFileAsDataURL(imagemSelecionada);
      const imageType = imageData.includes("image/png") ? "PNG" : "JPEG";
      const imageProps = doc.getImageProperties(imageData);

      const maxWidth = 180;
      const maxHeight = 150;

      const scale = Math.min(
        maxWidth / imageProps.width,
        maxHeight / imageProps.height
      );

      const renderWidth = imageProps.width * scale;
      const renderHeight = imageProps.height * scale;

      if (y + renderHeight > 280) {
        doc.addPage();
        y = 20;
      }

      doc.addImage(imageData, imageType, 14, y, renderWidth, renderHeight);

    } catch {
      showStatus("Falha ao processar a imagem.", "error");
    }
  }

  return { doc, bairro };
}

// ===============================
// COMPARTILHAMENTO
// ===============================

async function sharePdf(doc, bairro) {
  const pdfBlob = doc.output("blob");
  const safeName = sanitizeFileName(bairro);

  const pdfFile = new File(
    [pdfBlob],
    `Relatorio_Obras_${safeName}.pdf`,
    { type: "application/pdf" }
  );

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: "Relatório de Obra",
        text: "Segue o relatório em anexo.",
        files: [pdfFile]
      });

      showStatus("Compartilhado com sucesso.", "ok");
      return true;

    } catch {
      showStatus("Compartilhamento cancelado.", "error");
      return false;
    }
  }

  return false;
}

// ===============================
// EVENTOS
// ===============================

fotoArquivoEl.addEventListener("change", (e) => {
  setImage(e.target.files?.[0], fotoArquivoEl);
});

fotoCameraEl.addEventListener("change", (e) => {
  setImage(e.target.files?.[0], fotoCameraEl);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const result = await gerarPDF();
  if (!result) return;

  const { doc, bairro } = result;

  doc.save(`Relatorio_Obras_${sanitizeFileName(bairro)}.pdf`);
  showStatus("PDF gerado e download iniciado.", "ok");
});

btnShare.addEventListener("click", async () => {
  const result = await gerarPDF();
  if (!result) return;

  const { doc, bairro } = result;

  const shared = await sharePdf(doc, bairro);

  if (!shared) {
    doc.save(`Relatorio_Obras_${sanitizeFileName(bairro)}.pdf`);
    showStatus("Navegador não suporta compartilhamento. Download iniciado.", "ok");
  }
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearImagePreview();
    showStatus("");
    updateClock();
  }, 0);
});

// ===============================
// INICIALIZAÇÃO
// ===============================

updateClock();
setInterval(updateClock, 1000);
