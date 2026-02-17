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

async function sharePdf(doc, bairro) {
  const pdfBlob = doc.output("blob");

  const pdfFile = new File([pdfBlob], "Relatorio_Obras_${bairro}.pdf", {
    type: "application/pdf"
  });

  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: "Relatório de Obra",
        text: "Segue o relatório em anexo.",
        files: [pdfFile]
      });
      showStatus("Compartilhado com sucesso.", "ok");
      return true;
    } catch (err) {
      showStatus("Compartilhamento cancelado.", "error");
      return false
    }
  }
  return false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    showStatus("Preencha todos os campos obrigatórios.", "error");
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const bairro = data.get("bairro")?.toString().trim() || "";
  const rua = (data.get("rua")?.toString().trim() || "").toUpperCase();
  const complemento = data.get("complemento")?.toString().trim() || "";
  const descricao = data.get("descricao")?.toString().trim() || "";
  const horaRegistro = horaRegistroEl.value;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFont("arial", "bold");
  doc.setFontSize(18);
  doc.text("Relatório de obra concluida.", 14, 20);

  doc.setFont("arial", "normal");
  doc.setFontSize(12);

  let y = 40;

  doc.text(`Bairro: ${bairro}`, 14, y);
  y += 10;

  doc.text(`Rua: ${rua}`, 14, y);
  y += 10;

  doc.text(`Complemento: ${complemento}`, 14, y);
  y += 10;

  doc.text(`Descricao: ${descricao}`, 14, y);
  y += 10; // pequeno espaço extra antes da imagem

  doc.text(`Imagem anexada: ${imagemSelecionada ? "Sim" : "Não"}`, 14, y);
  y += 15;

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

      let imageY = y;
      if (imageY + renderHeight > 280) {
        doc.addPage();
        imageY = 20;
      }

      doc.addImage(imageData, imageType, 14, imageY, renderWidth, renderHeight);
    } catch (error) {
      showStatus("PDF gerado sem imagem: falha ao processar o arquivo.", "error");
    }
  }

  const shared = await sharePdf(doc, bairro);

  if (!shared) {
    doc.save(`Relatorio_Obras_${bairro}.pdf`);
    showStatus("PDF gerado e download iniciado.", "ok");
  }
});

form.addEventListener("reset", () => {
  setTimeout(() => {
    clearImagePreview();
    showStatus("", "");
    updateClock();
  }, 0);
});
