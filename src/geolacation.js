const localizacao = document.getElementById("geolocateBtn");
const locBairro = document.getElementById("bairro");
const locRua = document.getElementById("rua");

async function obterEndereco() {
  if (!navigator.geolocation) {
    throw new Error("Geolocalização não suportada pelo navegador.");
  }

  function posicaoAtual() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  try {
    const position = await posicaoAtual();
    const { latitude, longitude } = position.coords;

    // Requisição para OpenStreetMap (reverse geocoding)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    );

    if (!response.ok) {
      throw new Error("Erro ao buscar endereço.");
    }

    const data = await response.json();

    return {
      bairro: data.address.suburb || data.address.neighbourhood || "Não encontrado",
      rua: data.address.road || "Não encontrada"
    };

  } catch (error) {
    console.error("Erro:", error);
    throw error;
  }
}

localizacao.addEventListener("click", () => {
obterEndereco()
  .then(endereco => {
    locBairro.value = endereco.bairro;
    locRua.value = endereco.rua;
  })
  .catch(err => {
    console.error("Falha ao obter endereço:", err);
  });
})