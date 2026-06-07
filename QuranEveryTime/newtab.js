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

        // document.getElementById("wordByWord").innerHTML =
        //     "Word-by-word translation API can be integrated from Quran.com.";

    } catch (error) {
        console.error(error);
    }
}

const setTheme = (crtTheme) => {
    if (crtTheme == "black") {
        document.body.style.background = "black";
        document.body.style.color = "white";
    } else {
        document.body.style.background = "white";
        document.body.style.color = "black";
    }
}

const themeToggler = document.getElementById("ThemeToggler");
let theme = "black";
themeToggler.addEventListener("click", () => {
    if (theme === "black") {
        setTheme("white");
        theme = "white";
    } else {
        setTheme("black");
        theme = "black";
    }
});

document
    .getElementById("refreshBtn")
    .addEventListener("click", loadAyah);

loadAyah();
setTheme("black")
