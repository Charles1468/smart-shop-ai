
import { auth, db } from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    reload,
    getIdToken,
    PhoneAuthProvider,
    RecaptchaVerifier,
    linkWithCredential,
    deleteUser
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

import {
    parsePhoneNumberFromString
} from "https://esm.sh/libphonenumber-js@1.12.36";

/* =========================================
   SMART SHOP AI
   FIREBASE REGISTRATION FOUNDATION
========================================= */

"use strict";

/* =========================================
   1. GLOBAL VARIABLES
========================================= */

const screens = document.querySelectorAll(".screen");

let countries = [];
let selectedCountry = null;
let countryDataReady = false;
let countryLoadPromise = null;

let currentPhoneE164 = "";
let currentBusinessId = null;
let phoneVerificationId = null;
let recaptchaVerifier = null;

/* =========================================
   2. GENERAL FUNCTIONS
========================================= */

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

function getInput(id) {
    return document.getElementById(id).value.trim();
}

function getSelectedCategories() {
    return Array.from(
        document.querySelectorAll(
            "#rolesScreen input[type='checkbox']:checked"
        )
    ).map(function (checkbox) {
        return checkbox.value;
    });
}

function setButtonLoading(button, loading, normalText) {
    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : normalText;
}

/* =========================================
   3. TERMS AND CONDITIONS
========================================= */

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

/* =========================================
   4. WELCOME SCREEN
========================================= */

document.getElementById("showLoginButton").addEventListener("click", function () {
    showScreen("loginScreen");
});

document.getElementById("showRegisterButton").addEventListener("click", function () {
    showScreen("registerScreen");
});

/* =========================================
   5. BACK BUTTONS
========================================= */

document.querySelectorAll("[data-back]").forEach(function (button) {
    button.addEventListener("click", function () {
        showScreen(button.dataset.back);
    });
});

/* =========================================
   6. SHOW / HIDE PASSWORD
========================================= */

document.querySelectorAll(".password-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
        const input = document.getElementById(button.dataset.target);

        if (!input) return;

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
        } else {
            input.type = "password";
            button.textContent = "Show";
        }
    });
});

/* =========================================
   7. COUNTRY DATA
========================================= */

const COUNTRY_DATA_URL =
    "https://staticdata.dev/v1/countries.json";

const countrySearch = document.getElementById("countrySearch");
const countryResults = document.getElementById("countryResults");
const dialCode = document.getElementById("dialCode");

async function loadCountries() {

    if (countryLoadPromise) {
        return countryLoadPromise;
    }

    countryResults.style.display = "block";
    countryResults.textContent = "Loading country list...";

    countryLoadPromise = (async function () {

        try {
            const response = await fetch(COUNTRY_DATA_URL);

            if (!response.ok) {
                throw new Error("Country data could not be loaded.");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length !== 249) {
                throw new Error("Country dataset completeness check failed.");
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
                throw new Error("Some country records are incomplete.");
            }

            countries.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });

            countryDataReady = true;
            renderCountries(countrySearch.value);

        } catch (error) {
            console.error("Country loading error:", error);

            countryResults.textContent =
                "Country list could not load. Check your internet connection.";

            countryLoadPromise = null;
        }

    })();

    return countryLoadPromise;
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

    selectedCountry = null;
    dialCode.textContent = "";

    if (countryDataReady) {
        renderCountries(countrySearch.value);
    } else {
        loadCountries();
    }
});

/* =========================================
   8. PERSONAL INFORMATION VALIDATION
========================================= */

function validatePersonalInformation() {

    const fullName = getInput("fullName");
    const email = getInput("email").toLowerCase();
    const phone = getInput("phone");
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
        showMessage("Please complete all personal information fields.");
        return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage("Please enter a valid email address.");
        return null;
    }

    if (!selectedCountry) {
        showMessage("Please select your country from the country list.");
        return null;
    }

    const parsedPhone = parsePhoneNumberFromString(
        phone,
        selectedCountry.alpha2
    );

    if (
        !parsedPhone ||
        !parsedPhone.isValid() ||
        parsedPhone.country !== selectedCountry.alpha2
    ) {
        showMessage(
            "Invalid phone number. Please enter a valid number for your selected country."
        );
        return null;
    }

    if (password.length < 8) {
        showMessage("Your password must contain at least 8 characters.");
        return null;
    }

    if (password !== confirmPassword) {
        showMessage("Your passwords do not match.");
        return null;
    }

    return {
        fullName: fullName,
        email: email,
        phoneE164: parsedPhone.number,
        password: password,
        countryCode: selectedCountry.alpha2
    };
}

document.getElementById("personalNextButton")
    .addEventListener("click", function () {

        const details = validatePersonalInformation();

        if (!details) return;

        currentPhoneE164 = details.phoneE164;

        showScreen("businessScreen");
    });

/* =========================================
   9. BUSINESS INFORMATION
========================================= */

document.getElementById("businessNextButton")
    .addEventListener("click", function () {

        const businessName = getInput("businessName");
        const businessType = getInput("businessType");

        if (!businessName || !businessType) {
            showMessage(
                "Please enter your business name and select a business type."
            );
            return;
        }

        showScreen("rolesScreen");
    });

/* =========================================
   10. REGISTRATION REVIEW
========================================= */

document.getElementById("reviewButton")
    .addEventListener("click", function () {

        const personalDetails = validatePersonalInformation();

        if (!personalDetails) {
            showScreen("registerScreen");
            return;
        }

        const roles = getSelectedCategories();

        if (roles.length === 0) {
            showMessage("Please select at least one business category.");
            return;
        }

        const businessName = getInput("businessName");
        const businessType = getInput("businessType");

        if (!businessName || !businessType) {
            showMessage("Please complete your business information.");
            showScreen("businessScreen");
            return;
        }

        document.getElementById("reviewName").textContent =
            personalDetails.fullName;

        document.getElementById("reviewEmail").textContent =
            personalDetails.email;

        document.getElementById("reviewCountry").textContent =
            selectedCountry.flag + " " + selectedCountry.name;

        const parsedPhone = parsePhoneNumberFromString(
            personalDetails.phoneE164
        );

        document.getElementById("reviewPhone").textContent =
            parsedPhone
                ? parsedPhone.formatInternational()
                : personalDetails.phoneE164;

        document.getElementById("reviewBusiness").textContent =
            businessName;

        document.getElementById("reviewBusinessType").textContent =
            businessType;

        document.getElementById("reviewCAC").textContent =
            getInput("cacNumber") || "Not provided";

        const reviewRoles = document.getElementById("reviewRoles");

        reviewRoles.innerHTML = "";

        roles.forEach(function (role) {

            const roleTag = document.createElement("span");

            roleTag.className = "review-role";

            roleTag.textContent = role;

            reviewRoles.appendChild(roleTag);
        });

        showScreen("reviewScreen");
    });

/* =========================================
   11. FIRESTORE REGISTRATION
========================================= */

async function saveRegistration(user, details) {

    const businessName = getInput("businessName");
    const businessType = getInput("businessType");
    const cacNumber = getInput("cacNumber");

    const businessCategories = getSelectedCategories();

    // Generate a new business document ID.
    const businessRef = doc(collection(db, "businesses"));

    const userRef = doc(db, "users", user.uid);

    const memberRef = doc(
        db,
        "businesses",
        businessRef.id,
        "members",
        user.uid
    );

    const membershipIndexRef = doc(
        db,
        "users",
        user.uid,
        "businessMemberships",
        businessRef.id
    );

    // All four records are written together.
    const batch = writeBatch(db);

    batch.set(userRef, {
        uid: user.uid,
        fullName: details.fullName,
        email: user.email,
        countryCode: details.countryCode,
        phoneE164: details.phoneE164,
        businessCategories: businessCategories,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    batch.set(businessRef, {
        name: businessName,
        type: businessType,
        cacNumber: cacNumber,
        countryCode: details.countryCode,
        ownerId: user.uid,
        status: "pendingVerification",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    batch.set(memberRef, {
        uid: user.uid,
        role: "owner",
        status: "active",
        createdAt: serverTimestamp()
    });

    batch.set(membershipIndexRef, {
        businessId: businessRef.id,
        businessName: businessName,
        role: "owner",
        status: "active",
        createdAt: serverTimestamp()
    });

    await batch.commit();

    currentBusinessId = businessRef.id;
}

/* =========================================
   12. ACCOUNT REGISTRATION
========================================= */

const submitRegistrationButton =
    document.getElementById("submitRegistrationButton");

submitRegistrationButton.addEventListener("click", async function () {

    const details = validatePersonalInformation();

    if (!details) return;

    const businessName = getInput("businessName");
    const businessType = getInput("businessType");
    const roles = getSelectedCategories();

    if (!businessName || !businessType || roles.length === 0) {
        showMessage("Please check your business information and categories.");
        return;
    }

    setButtonLoading(
        submitRegistrationButton,
        true,
        "Submit Registration"
    );

    let newUser = null;
    let firestoreSaved = false;

    try {

        // Create Firebase Authentication account.
        const credential = await createUserWithEmailAndPassword(
            auth,
            details.email,
            details.password
        );

        newUser = credential.user;

        // Save the user's display name.
        await updateProfile(newUser, {
            displayName: details.fullName
        });

        // Save the four Firestore records.
        await saveRegistration(newUser, details);

        firestoreSaved = true;

        // Send email verification.
        await sendEmailVerification(newUser);

        document.getElementById("verificationStatus").textContent =
            "Your account has been created. Check " +
            details.email +
            " and click the verification link. Then return here.";

        document.getElementById("phoneVerificationArea").hidden = true;

        showScreen("verificationScreen");

        showMessage(
            "Your Smart Shop AI account has been created successfully.\n\n" +
            "Your business has also been registered, and you are its first owner.\n\n" +
            "Please check your email to verify your account."
        );

    } catch (error) {

        console.error("Registration error:", error);

        // If the Firestore batch failed, attempt to remove
        // the newly created Authentication account.
        if (newUser && !firestoreSaved) {

            try {
                await deleteUser(newUser);
            } catch (cleanupError) {
                console.error("Account cleanup error:", cleanupError);
            }
        }

        let message = "Registration failed. Please try again.";

        if (error.code === "auth/email-already-in-use") {
            message =
                "This email address already has an account. Please sign in instead.";
        } else if (error.code === "auth/weak-password") {
            message = "Please choose a stronger password.";
        } else if (error.code === "auth/invalid-email") {
            message = "Please enter a valid email address.";
        } else if (error.code === "auth/network-request-failed") {
            message = "Network error. Check your internet connection.";
        } else if (error.code === "permission-denied") {
            message =
                "Firebase security rules rejected registration. Please report this error before trying again.";
        } else {
            message += "\n\nDetails: " + error.message;
        }

        showMessage(message);

    } finally {

        setButtonLoading(
            submitRegistrationButton,
            false,
            "Submit Registration"
        );
    }
});

/* =========================================
   13. EMAIL VERIFICATION
========================================= */

document.getElementById("checkEmailVerificationButton")
    .addEventListener("click", async function () {

        const user = auth.currentUser;

        if (!user) {
            showMessage("Please sign in again.");
            showScreen("loginScreen");
            return;
        }

        try {

            await reload(user);

            const refreshedUser = auth.currentUser;

            await getIdToken(refreshedUser, true);

            if (!refreshedUser.emailVerified) {

                showMessage(
                    "Your email has not been verified yet. Open the verification link in your inbox, then try again."
                );

                return;
            }

            document.getElementById("verificationStatus").textContent =
                "Email verified successfully. Now verify your phone number.";

            document.getElementById("phoneVerificationArea").hidden = false;

            if (refreshedUser.phoneNumber) {
                await openDashboard(refreshedUser);
            }

        } catch (error) {

            console.error("Email verification check:", error);

            showMessage(
                "Could not check email verification. Please try again."
            );
        }
    });

/* =========================================
   14. PHONE VERIFICATION
========================================= */

document.getElementById("sendPhoneCodeButton")
    .addEventListener("click", async function () {

        const user = auth.currentUser;

        if (!user) {
            showMessage("Please sign in again..");
            return;
        }

        if (!user.emailVerified) {
            showMessage("Please verify your email before verifying your phone.");
            return;
        }

        if (user.phoneNumber) {
            showMessage("Your phone number is already verified.");
            return;
        }

        if (!currentPhoneE164) {

            const profile = await getDoc(doc(db, "users", user.uid));

            if (profile.exists()) {
                currentPhoneE164 = profile.data().phoneE164;
            }
        }

        if (!currentPhoneE164) {
            showMessage("Your registered phone number could not be found.");
            return;
        }

        const button = document.getElementById("sendPhoneCodeButton");

        setButtonLoading(button, true, "Send SMS Verification Code");

        try {

            if (recaptchaVerifier) {
                recaptchaVerifier.clear();
            }

            recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                {
                    size: "normal"
                }
            );

            const provider = new PhoneAuthProvider(auth);

            phoneVerificationId = await provider.verifyPhoneNumber(
                currentPhoneE164,
                recaptchaVerifier
            );

            showMessage(
                "An SMS verification code has been sent to " +
                currentPhoneE164
            );

        } catch (error) {

            console.error("Phone SMS error:", error);

            showMessage(
                "Could not send the SMS verification code.\n\n" +
                error.message
            );

        } finally {

            setButtonLoading(
                button,
                false,
                "Send SMS Verification Code"
            );
        }
    });

document.getElementById("verifyPhoneCodeButton")
    .addEventListener("click", async function () {

        const code = getInput("phoneVerificationCode");

        if (!phoneVerificationId) {
            showMessage("Please request an SMS verification code first.");
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            showMessage("Please enter the six-digit SMS code.");
            return;
        }

        const user = auth.currentUser;

        if (!user) {
            showMessage("Please sign in again.");
            return;
        }

        const button = document.getElementById("verifyPhoneCodeButton");

        setButtonLoading(button, true, "Verify Phone Number");

        try {

            const credential = PhoneAuthProvider.credential(
                phoneVerificationId,
                code
            );

            // Link the phone number to the existing email account.
            await linkWithCredential(user, credential);

            await reload(user);

            await getIdToken(auth.currentUser, true);

            showMessage("Your phone number has been verified successfully.");

            await openDashboard(auth.currentUser);

        } catch (error) {

            console.error("Phone verification error:", error);

            let message = "Phone verification failed.";

            if (error.code === "auth/invalid-verification-code") {
                message = "The SMS verification code is incorrect.";
            } else if (error.code === "auth/credential-already-in-use") {
                message = "This phone number is already linked to another account.";
            } else {
                message += "\n\n" + error.message;
            }

            showMessage(message);

        } finally {

            setButtonLoading(
                button,
                false,
                "Verify Phone Number"
            );
        }
    });

/* =========================================
   15. LOAD BUSINESS AND OPEN DASHBOARD
========================================= */

async function openDashboard(user) {

    if (!user || !user.emailVerified || !user.phoneNumber) {

        document.getElementById("phoneVerificationArea").hidden =
            !user || !user.emailVerified;

        showScreen("verificationScreen");

        return;
    }

    try {

        const membershipCollection = collection(
            db,
            "users",
            user.uid,
            "businessMemberships"
        );

        const memberships = await getDocs(membershipCollection);

        if (memberships.empty) {

            showMessage(
                "Your account has no registered business yet. Please contact support."
            );

            return;
        }

        currentBusinessId = memberships.docs[0].id;

        showScreen("dashboardScreen");

    } catch (error) {

        console.error("Dashboard loading error:", error);

        showMessage(
            "Your business could not be loaded. Please try signing in again."
        );
    }
}

/* =========================================
   16. SIGN IN
========================================= */

document.getElementById("loginButton")
    .addEventListener("click", async function () {

        const identity = getInput("loginIdentity").toLowerCase();

        const password = document.getElementById("loginPassword").value;

        if (!identity || !password) {
            showMessage("Please enter your email and password.");
            return;
        }

        if (!identity.includes("@")) {
            showMessage(
                "For now, please sign in using your registered email address. Phone-number sign-in will be added separately."
            );
            return;
        }

        const button = document.getElementById("loginButton");

        setButtonLoading(button, true, "Sign In");

        try {

            const credential = await signInWithEmailAndPassword(
                auth,
                identity,
                password
            );

            await reload(credential.user);

            await openDashboard(auth.currentUser);

        } catch (error) {

            console.error("Sign-in error:", error);

            let message = "Sign-in failed.";

            if (
                error.code === "auth/invalid-credential" ||
                error.code === "auth/user-not-found" ||
                error.code === "auth/wrong-password"
            ) {
                message = "Incorrect email or password.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Too many attempts. Please try again later.";
            }

            showMessage(message);

        } finally {

            setButtonLoading(button, false, "Sign In");
        }
    });

/* =========================================
   17. FORGOT PASSWORD
========================================= */

document.getElementById("forgotPasswordLink")
    .addEventListener("click", async function (event) {

        event.preventDefault();

        const email = getInput("loginIdentity").toLowerCase();

        if (!email || !email.includes("@")) {
            showMessage(
                "Enter your registered email address in the sign-in field first."
            );
            return;
        }

        try {

            await sendPasswordResetEmail(auth, email);

            showMessage(
                "Password reset instructions have been sent to your email."
            );

        } catch (error) {

            console.error("Password reset error:", error);

            showMessage(
                "Password reset could not be sent. " + error.message
            );
        }
    });

/* =========================================
   18. INITIAL STATE
========================================= */

continueButton.disabled = !acceptTerms.checked;

document.getElementById("phoneVerificationArea").hidden = true;

showScreen("termsScreen");

console.log("Smart Shop AI Firebase registration system initialized.");
