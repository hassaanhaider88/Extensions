async function loadAyah() {
    try {

        const randomAyah =
            Math.floor(Math.random() * 6236) + 1;

        const arabicResponse =
            await fetch(
                `https://api.alquran.cloud/v1/ayah/${randomAyah}`
            );

        const urduResponse =
            await fetch(
                `https://api.alquran.cloud/v1/ayah/${randomAyah}/ur.jalandhry`
            );

        const arabicData =
            await arabicResponse.json();

        const urduData =
            await urduResponse.json();
        console.log(arabicData, "Showing Arabic data")
        document.getElementById("arabic").innerHTML =
            arabicData.data.text;

        document.getElementById("urdu").innerHTML =
            urduData.data.text;

        document.getElementById("reference").innerHTML =
            `${arabicData.data.surah.name}
      (${arabicData.data.surah.number})
      -  آیت  نمبر ${arabicData.data.numberInSurah}`;

        document.getElementById("wordByWord").innerHTML =
            "Word-by-word translation API can be integrated from Quran.com.";

    } catch (error) {
        console.error(error);
    }
}

document
    .getElementById("refreshBtn")
    .addEventListener("click", loadAyah);

loadAyah();