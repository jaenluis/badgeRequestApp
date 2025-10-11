// ✅ Import Supabase client
import { supabase } from "./supabaseClient.js";

// ✅ Detect environment and set API base URL dynamically
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000" // local dev backend
    : "https://badge-request-app.vercel.app"; // Vercel backend

// Local collection to hold entries
const entries = [];

function showError(inputEl, message) {
    inputEl.classList.add("error");
  
    // Find the error-slot in the wrapper
    const wrapper = inputEl.parentElement;
    const slot = wrapper.querySelector(".error-slot");
  
    // Clear old message
    slot.innerHTML = "";
  
    // Insert new message
    const msg = document.createElement("div");
    msg.className = "error-message";
    msg.textContent = message;
    slot.appendChild(msg);
}
  
function clearError(inputEl) {
    inputEl.classList.remove("error");
  
    // Clear its slot
    const wrapper = inputEl.parentElement;
    const slot = wrapper.querySelector(".error-slot");
    if (slot) slot.innerHTML = "";
}

// Toggle between LDAP and AIN fields based on dropdown
const idTypeSelect = document.getElementById("idType");

// Reusable function to update the visibility of LDAP / TimeClock fields.
// Call this whenever the idType changes programmatically or by user interaction.
function updateIdTypeFields() {
  const isLDAP = idTypeSelect.value === "LDAP";
  // .ldap elements (labels + inputs) should show only when LDAP is selected
  document.querySelectorAll(".ldap").forEach(el => el.style.display = isLDAP ? "block" : "none");
  // .timeclock elements should show only when Time Clock is selected
  document.querySelectorAll(".timeclock").forEach(el => el.style.display = isLDAP ? "none" : "block");
}

// Wire up the change event to call the reusable function (for user changes)
idTypeSelect.addEventListener("change", updateIdTypeFields);

// Ensure the UI is correct on initial load (page open / script run)
updateIdTypeFields();

// Hide/show the ID Type dropdown and force LDAP for Link/Impact companies.
// Called when the company radio changes, and once on load.
function updateCompanyBehavior() {
    // read the currently selected company (may be undefined if none selected)
    const company = document.querySelector("input[name='company']:checked")?.value;
  
    // DOM wrapper we added in HTML above
    const idTypeWrapper = document.getElementById("idTypeWrapper");
  
    // If Link or Impact → hide the dropdown and force LDAP mode
    if (company === "Link" || company === "Impact") {
      idTypeWrapper.style.display = "none";  // hide the whole dropdown block
      idTypeSelect.value = "LDAP";           // force value
      // show ldap fields, hide timeclock fields to keep UI consistent
      document.querySelectorAll(".ldap").forEach(el => el.style.display = "block");
      document.querySelectorAll(".timeclock").forEach(el => el.style.display = "none");
  
      // clear any previous inline errors for those fields (user-friendly)
      clearError(document.getElementById("ldapField"));
      clearError(document.getElementById("ainField"));

      //clear AIN if filled previously
      document.getElementById("ainField").value = "";
      
    } else {
      // show the dropdown and let existing logic control field visibility
      idTypeWrapper.style.display = "block";
      updateIdTypeFields();
    }
}

// Wire company radio buttons to call the function whenever the choice changes
document.querySelectorAll("input[name='company']").forEach(radio => {
    radio.addEventListener("change", updateCompanyBehavior);
});
  
// Ensure the UI respects the currently selected company on page load
updateCompanyBehavior();

// Add entry to table
async function addEntry() {
    // Clear any old errors
    ["employeeName", "ldapField", "ainField"].forEach(id => {
        clearError(document.getElementById(id));
    });
    const requesterName = document.getElementById("requesterName").value.trim();
    const company = document.querySelector("input[name='company']:checked").value;
    const employeeName = document.getElementById("employeeName").value.trim();
    // When Link/Impact are selected, force LDAP (we hide the dropdown); otherwise read dropdown
    const idType = (company === "Link" || company === "Impact")
        ? "LDAP"
        : document.getElementById("idType").value;
    const ldap = idType === "LDAP" ? document.getElementById("ldapField").value.trim() : "";
    const ain = idType === "Time Clock" ? document.getElementById("ainField").value.trim() : "";

    // ✅ Required fields
    if (!employeeName) {
        showError(document.getElementById("employeeName"), "Employee name is required.");
        return;
    }
    if (idType === "LDAP" && !ldap) {
        showError(document.getElementById("ldapField"), "LDAP is required.");
        return;
    }
    if (idType === "Time Clock" && !ain) {
        showError(document.getElementById("ainField"), "AIN is required.");
        return;
    }
    
    // ✅ LDAP format check — company-specific lengths (Link=11, Impact=10, default=7)
    if (idType === "LDAP") {
        let ldapRegex;
        let ldapMessage;

        if (company === "Link") {
            ldapRegex = /^[a-zA-Z0-9]{11}$/;
            ldapMessage = "Link LDAP must be exactly 11 alphanumeric characters.";
        } else if (company === "Impact") {
            ldapRegex = /^[a-zA-Z0-9]{10}$/;
            ldapMessage = "Impact LDAP must be exactly 10 alphanumeric characters.";
        } else {
            ldapRegex = /^[a-zA-Z0-9]{7}$/;
            ldapMessage = "LDAP must be exactly 7 letters or numbers.";
        }

        if (!ldapRegex.test(ldap)) {
            showError(document.getElementById("ldapField"), ldapMessage);
            return;
        }
    }

    // ✅ AIN format check
    if (idType === "Time Clock") {
        const ainRegex = /^\d{9}$/;
        if (!ainRegex.test(ain)) {
            showError(document.getElementById("ainField"), "AIN must be exactly 9 digits.");
            return;
        }
    }
    // 🔹 Prevent duplicate entries
    const isDuplicate = entries.some(entry =>
        entry.employeeName.toLowerCase() === employeeName.toLowerCase() && 
        entry.company === company &&
        ((idType === "LDAP" && entry.ldap.toLowerCase() === ldap.toLowerCase()) ||
         (idType === "Time Clock" && entry.ain === ain))
    );

    if (isDuplicate) {
        if (idType === "LDAP") {
            showError(document.getElementById("ldapField"), "Duplicate LDAP for this employee/company.");
        } else {
            showError(document.getElementById("ainField"), "Duplicate AIN for this employee/company.");
        }
        return;
    }

    // ✅ Insert into Supabase
    const { data, error } = await supabase.from("badge_requests").insert([
        {
            requester_name: requesterName,
            company,
            employee_name: employeeName,
            ldap,
            ain
        }
    ]);

    if (error) {
        console.error("Supabase insert error:", error);
        alert("❌ Failed to save entry to database.");
        return;
    }

    // Store entry in memory
    entries.push({ requesterName, company, employeeName, ldap, ain });

    // ✅ Show Done button after first entry
    document.getElementById("doneBtn").style.display = "inline-block";

    // Update table
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${employeeName}</td>
        <td>${ldap}</td>
        <td>${ain}</td>
        <td>${company}</td>
    `;
    document.getElementById("entriesBody").appendChild(row);

    // Clear form fields (but keep requester + company for convenience)
    document.getElementById("employeeName").value = "";
    document.getElementById("ldapField").value = "";
    document.getElementById("ainField").value = "";

    // ✅ Hide partial input warning once user adds entry
    document.getElementById("partialWarning").style.display = "none";
    
    // ✅ Ensure UI reflects current idType selection (if you cleared and left idType unchanged)
    updateIdTypeFields();
}

// Handle Add More button
document.getElementById("addMoreBtn").addEventListener("click", addEntry);

// Handle Done button (form submit)
document.getElementById("badgeForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ Check for partially filled input
    const employeeName = document.getElementById("employeeName").value.trim();
    const idType = document.getElementById("idType").value;
    const ldap = idType === "LDAP" ? document.getElementById("ldapField").value.trim() : "";
    const ain = idType === "Time Clock" ? document.getElementById("ainField").value.trim() : "";

    if (employeeName || ldap || ain) {
        // ❌ Partially filled input detected → show tooltip
        document.getElementById("partialWarning").style.display = "block";
        return; // stop submission until user resolves
    }

    // ✅ Hide warning if no partial input
    document.getElementById("partialWarning").style.display = "none";

    // ❌ No entries yet → alert and STOP
    if (entries.length === 0) {
        alert("No entries to submit");
        return;
    }
    // ✅ Build payload for backend
    const payload = {
        requesterName: document.getElementById("requesterName").value.trim(),
        company: document.querySelector("input[name='company']:checked").value,
        entries: entries.map(e => ({
            employeeName: e.employeeName,
            idType: e.ldap ? "LDAP" : "Time Clock",
            idValue: e.ldap ? e.ldap : e.ain,
            company: e.company
        }))
    };

    // ✅ Send POST request to backend API
    try {
        const response = await fetch(`${API_BASE_URL}/api/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
          
        if (!response.ok) {
            const text = await response.text();
            console.error("Server error:", text);
            alert("❌ Failed to send email. Check console for details.");
            return; // stop if failed
        }

        // ✅ Show the success modal instead of alert
        const modal = document.getElementById("successModal");
        modal.style.display = "flex"; // center modal (flexbox)
    } catch (err) {
        console.error("Network or send error:", err);
        alert("❌ Could not connect to server. Is it running?");
        return;
    }

    // 🔹 RESET STEPS:

    // 1️⃣ Clear the table rows
    const entriesBody = document.getElementById("entriesBody");
    entriesBody.innerHTML = ""; // remove all <tr> elements

    // 2️⃣ Clear the local entries array
    entries.length = 0; // reset array in place
 
    // 3️⃣ Reset form fields
    document.getElementById("employeeName").value = "";
    document.getElementById("ldapField").value = "";
    document.getElementById("ainField").value = "";
    document.getElementById("requesterName").value = "";
    // Reset idType to default, then update the UI so AIN hides and LDAP shows.
    // Use the reusable function instead of relying on a user-triggered change.
    document.getElementById("idType").value = "LDAP"; // default to LDAP
    updateIdTypeFields(); // <-- ensure fields visibility immediately follows the new value

 
   // 🔹 Hide Done button until next entry is added
   document.getElementById("doneBtn").style.display = "none";
});

// ✅ Close modal when user clicks "Close"
document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("successModal").style.display = "none";
});
  