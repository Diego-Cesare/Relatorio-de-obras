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

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
                headers: {
                    "Accept": "application/json"
                }
            }
        );
        if (!response.ok) {
            throw new Error("Erro ao buscar endereço.");
        }

        const data = await response.json();

        return {
            bairro: data.address.suburb || data.address.neighbourhood || "Não encontrado. Incira manualmente!",
            rua: data.address.road || "Não encontrada. Incira manualmente!"
        };

    } catch (error) {
        console.error("Erro:", error);
        throw error;
    }
}

localizacao.addEventListener("click", async (e) => {
    e.preventDefault();
    localizacao.disabled = true;

    try {
        const endereco = await obterEndereco();
        locBairro.value = endereco.bairro;
        locRua.value = endereco.rua;
    } catch (err) {
        locBairro.value = "";
        locRua.value = "";
        alert("Erro ao obter localização. Permita acesso à localização.");
        console.error(err);
    } finally {
        localizacao.disabled = false;
    }
});