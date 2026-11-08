
import { auth, db } from "./firebase-config.js";

/* =========================================
   SMART SHOP AI — VERSION 1
   Application navigation and interactions
========================================= */

"use strict";

/* -----------------------------------------
   1. SCREEN NAVIGATION
----------------------------------------- */

const screens = document.querySelectorAll(".screen");

function showScreen(screenId) {
    screens.forEach(function (screen) {
        screen.classList.remove("active");
    });

    const selectedScreen = document.getElementById(screenId);

    if (selectedScreen) {
        selectedScreen.classList.add("active");
        window.scrollTo(0, 0);
    }
}

function showMessage(message) {
    alert(message);
}

/* -----------------------------------------
   2. TERMS AND CONDITIONS
----------------------------------------- */

const acceptTerms = document.getElementById("acceptTerms");
const continueButton = document.getElementById("continueButton");

acceptTerms.addEventListener("change", function () {
    continueButton.disabled = !acceptTerms.checked;
});

continueButton.addEventListener("click", function () {
    if (!acceptTerms.checked) {
        showMessage("Please accept the Terms and Conditions first.");
        return;
    }

    showScreen("welcomeScreen");
});

document.getElementById("termsLink").addEventListener("click", function (event) {
    event.preventDefault();

    showMessage(
        "The full Terms and Conditions document still needs to be prepared."
    );
});

document.getElementById("privacyLink").addEventListener("click", function (event) {
    event.preventDefault();

    showMessage(
        "The full Privacy Policy document still needs to be prepared."
    );
});

/* -----------------------------------------
   3. WELCOME SCREEN
----------------------------------------- */

document.getElementById("showLoginButton").addEventListener("click", function () {
    showScreen("loginScreen");
});

document.getElementById("showRegisterButton").addEventListener("click", function () {
    showScreen("registerScreen");
});

/* -----------------------------------------
   4. BACK BUTTONS
----------------------------------------- */

document.querySelectorAll("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () {
        showScreen(button.dataset.back);
    });
});

/* -----------------------------------------
   5. SHOW / HIDE PASSWORD
----------------------------------------- */

document.querySelectorAll(".password-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
        const targetId = button.dataset.target;
        const passwordInput = document.getElementById(targetId);

        if (!passwordInput) {
            return;
        }

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            button.textContent = "Hide";
        } else {
            passwordInput.type = "password";
            button.textContent = "Show";
        }
    });
});

/* -----------------------------------------
   6. COUNTRY DATA
   ISO 3166-1 country dataset
----------------------------------------- */

const COUNTRY_DATA_URL =
    "https://staticdata.dev/v1/countries.json";

let countries = [];
let selectedCountry = null;
let countryDataReady = false;

const countrySearch = document.getElementById("countrySearch");
const countryResults = document.getElementById("countryResults");
const dialCode = document.getElementById("dialCode");

async function loadCountries() {
    countryResults.style.display = "block";
    countryResults.textContent = "Loading country list...";

    try {
        const response = await fetch(COUNTRY_DATA_URL);

        if (!response.ok) {
            throw new Error("Country data could not be loaded.");
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length !== 249) {
            throw new Error("Country dataset failed its completeness check.");
        }


        countries = data.filter(function (country) {
            return (
                typeof country.name === "string" &&
                typeof country.alpha2 === "string" &&
                typeof country.callingCode === "string" &&
                typeof country.flag === "string"
            );
        });

        if (countries.length !== 249) {
            throw new Error("Some country records are missing required fields.");
        }

        countries.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        countryDataReady = true;

        renderCountries("");

    } catch (error) {
        console.error("Country data error:", error);

        countryResults.textContent =
            "Country list could not load. Check your internet connection and try again.";
    }
}

function renderCountries(searchText) {
    countryResults.innerHTML = "";

    const search = searchText.trim().toLowerCase();

    const matchingCountries = countries.filter(function (country) {
        return (
            country.name.toLowerCase().includes(search) ||
            country.alpha2.toLowerCase() === search ||
            country.callingCode.toLowerCase().includes(search)
        );
    });

    if (matchingCountries.length === 0) {
        countryResults.textContent = "No matching country found.";
        countryResults.style.display = "block";
        return;
    }

    matchingCountries.forEach(function (country) {
        const option = document.createElement("button");

        option.type = "button";
        option.className = "country-option";

        option.textContent =
            country.flag + " " +
            country.name + " (" +
            country.callingCode + ")";

        option.addEventListener("click", function () {
            selectedCountry = country;

            countrySearch.value =
                country.flag + " " + country.name;

            dialCode.textContent = country.callingCode;

            countryResults.style.display = "none";
        });

        countryResults.appendChild(option);
    });

    countryResults.style.display = "block";
}

countrySearch.addEventListener("focus", function () {
    if (!countryDataReady) {
        loadCountries();
    } else {
        renderCountries(countrySearch.value);
    }
});

countrySearch.addEventListener("input", function () {
    if (countryDataReady) {
        renderCountries(countrySearch.value);
    } else {
        loadCountries();
    }
});

/* -----------------------------------------
   7. PERSONAL INFORMATION VALIDATION
----------------------------------------- */

document.getElementById("personalNextButton").addEventListener("click", function () {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
        showMessage("Please complete all personal information fields.");
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("Please enter a valid email address.");
        return;
    }

    if (!selectedCountry) {
        showMessage("Please select your country from the country list.");
        return;
    }

    if (!/^[0-9]{5,15}$/.test(phone.replace(/[\s-]/g, ""))) {
        showMessage("Please enter a valid phone number.");
        return;
    }

    if (password.length < 8) {
        showMessage("Your password must contain at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match.");
        return;
    }

    showScreen("businessScreen");
});

/* -----------------------------------------
   8. BUSINESS INFORMATION VALIDATION
----------------------------------------- */

document.getElementById("businessNextButton").addEventListener("click", function () {
    const businessName =
        document.getElementById("businessName").value.trim();

    const businessType =
        document.getElementById("businessType").value;

    if (!businessName || !businessType) {
        showMessage("Please enter your business name and select a business type.");
        return;
    }

    showScreen("rolesScreen");
});


/* -----------------------------------------
   9. BUSINESS ROLE SELECTION
   AND REGISTRATION REVIEW
----------------------------------------- */

document.getElementById("reviewButton").addEventListener("click", function () {

    const selectedRoles = document.querySelectorAll(
        "#rolesScreen input[type='checkbox']:checked"
    );

    if (selectedRoles.length === 0) {
        showMessage("Please select at least one business role.");
        return;
    }

    // Collect selected business roles
    const roles = Array.from(selectedRoles).map(function (checkbox) {
        return checkbox.parentElement.textContent.trim();
    });

    // Collect personal information
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Collect business information
    const businessName =
        document.getElementById("businessName").value.trim();

    const businessType =
        document.getElementById("businessType").value;

    const cacNumber =
        document.getElementById("cacNumber").value.trim();

    // Display personal information
    document.getElementById("reviewName").textContent = fullName;
    document.getElementById("reviewEmail").textContent = email;

    document.getElementById("reviewCountry").textContent =
        selectedCountry
            ? selectedCountry.flag + " " + selectedCountry.name
            : "Not selected";

    document.getElementById("reviewPhone").textContent =
        (selectedCountry ? selectedCountry.callingCode + " " : "") + phone;

    // Display business information
    document.getElementById("reviewBusiness").textContent = businessName;
    document.getElementById("reviewBusinessType").textContent = businessType;
    document.getElementById("reviewCAC").textContent =
        cacNumber || "Not provided";

    // Display selected roles
    const reviewRoles = document.getElementById("reviewRoles");

    reviewRoles.innerHTML = "";

    roles.forEach(function (role) {
        const roleTag = document.createElement("span");

        roleTag.className = "review-role";
        roleTag.textContent = role;

        reviewRoles.appendChild(roleTag);
    });

    // Open review page
    showScreen("reviewScreen");
});

/* -----------------------------------------
   9B. REGISTRATION SUBMISSION
----------------------------------------- */

document.getElementById("submitRegistrationButton")
    .addEventListener("click", function () {

        showMessage(
            "Your registration information has been reviewed.\n\n" +
            "The secure account creation and email/phone verification " +
            "system will be connected in the next stage.\n\n" +
            "No account has been created yet."
        );

    });


/* -----------------------------------------
   10. SIGN-IN PLACEHOLDER
----------------------------------------- */

document.getElementById("loginButton").addEventListener("click", function () {
    const identity =
        document.getElementById("loginIdentity").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    if (!identity || !password) {
        showMessage("Please enter your email or phone number and password.");
        return;
    }

    showMessage(
        "The sign-in screen is ready, but secure account authentication " +
        "has not yet been connected to a backend."
    );
});

document.getElementById("forgotPasswordLink").addEventListener("click", function (event) {
    event.preventDefault();

    showMessage("Password recovery will be connected when authentication is built.");
});

/* -----------------------------------------
   11. INITIAL STATE
----------------------------------------- */

continueButton.disabled = !acceptTerms.checked;

showScreen("termsScreen");

console.log("Smart Shop AI interface initialized.");