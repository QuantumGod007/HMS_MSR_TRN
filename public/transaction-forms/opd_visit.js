var original = {};
var pendingNav = null;

function setToggleActive(mode) {
    var findBtn = document.getElementById('find_btn');
    var newBtn = document.getElementById('new_btn');
    if (mode === 'Find') {
        findBtn.classList.add('active');
        newBtn.classList.remove('active');
    } else {
        newBtn.classList.add('active');
        findBtn.classList.remove('active');
    }
    document.getElementById('next_btn').disabled = (mode === 'New');
}

function showModal(msg) {
    document.getElementById('modal_text').innerText = msg;
    document.getElementById('custom_modal').showModal();
}

document.getElementById('modal_close_btn').addEventListener('click', function() {
    document.getElementById('custom_modal').close();
});

function setMsg(text, color, clearAfterMs) {
    var box = document.getElementById('form_msg');
    box.innerText = text;
    box.style.color = color || 'green';

    if (window.msgTimer) clearTimeout(window.msgTimer);

    if (clearAfterMs) {
        window.msgTimer = setTimeout(function() {
            box.innerText = '';
            box.style.color = 'green';
        }, clearAfterMs);
    }
}

function markFieldError(f) {
    f.style.borderColor = '#ef4444';
    f.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
    f.addEventListener('change', function clear() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('change', clear);
    });
    f.addEventListener('input', function clearInput() {
        f.style.borderColor = '';
        f.style.boxShadow = '';
        f.removeEventListener('input', clearInput);
    });
}

function clearErrors() {
    ['appt_search', 'chief_complaint', 'diagnosis'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }
    });
}

function setIdReadonly(val) {
    var idField = document.getElementById('opd_visit_id');
    idField.readOnly = val;
    idField.style.backgroundColor = val ? '' : 'white';
    idField.style.color = val ? '' : '#1f2937';
}

function setVisitLocked(locked) {
    ['appt_search', 'chief_complaint', 'diagnosis', 'prescription_notes'].forEach(function(id) {
        var field = document.getElementById(id);
        field.readOnly = locked;
        field.disabled = locked;
    });

    var saveBtn = document.getElementById('save_btn');
    saveBtn.disabled = locked;
    saveBtn.innerText = locked ? 'Completed' : 'Save';
}

async function fetchNextId() {
    try {
        var res = await fetch('/opd/next-id');
        var data = await res.json();
        if (data.success) {
            document.getElementById('opd_visit_id').value = data.next_id;
        }
    } catch (e) {}
}

var appts = [];

async function loadApptsForOPD() {
    try {
        var res = await fetch('/appointments');
        var data = await res.json();
        if (data.success) appts = data.list;
    } catch (e) {}
}

function showApptSuggestions(inputVal) {
    var val = (inputVal || '').toLowerCase().trim();
    var box = document.getElementById('appt_suggestions');

    var matches = appts.filter(function(a) {
        if (!val) return true;
        var apptIdMatch = String(a[0]).includes(val);
        var ptNameMatch = (a[1] + ' ' + (a[2] || '')).toLowerCase().includes(val);
        var uhidMatch   = a[3] && a[3].toLowerCase().includes(val);
        var docNameMatch= a[4] && a[4].toLowerCase().includes(val);
        return apptIdMatch || ptNameMatch || uhidMatch || docNameMatch;
    });

    if (matches.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = '';
    var table = document.createElement('table');
    table.className = 'suggestion-table';

    var thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Appt ID</th><th>Patient Name</th><th>Doctor</th><th>Date & Time</th></tr>';
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    matches.slice(0, 30).forEach(function(a) {
        var tr = document.createElement('tr');
        var fullName = a[1] + (a[2] ? ' ' + a[2] : '');
        tr.innerHTML = '<td>' + a[0] + '</td><td>' + fullName + ' (' + (a[3] || '') + ')</td><td>' + (a[4] || '') + '</td><td>' + (a[5] || '') + '</td>';
        tr.addEventListener('mousedown', async function(e) {
            e.preventDefault();
            document.getElementById('appointment_id').value = String(a[0]);
            document.getElementById('appt_search').value    = a[0] + ' - ' + fullName + ' (' + (a[4] || '') + ')';
            box.style.display = 'none';

            if (!isUpdateMode()) {
                try {
                    var res = await fetch('/opd/by-appointment/' + a[0]);
                    var data = await res.json();
                    if (data.found) {
                        setMsg('Warning: OPD visit already exists for this appointment (Visit ' + data.opd_visit_id + '). Pick a different one.', 'red');
                    } else {
                        setMsg('', 'green');
                    }
                } catch (err) {}
            }
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);
    box.style.display = 'block';
}

document.getElementById('appt_search').addEventListener('focus', async function() {
    await loadApptsForOPD();
    showApptSuggestions(this.value);
});

document.getElementById('appt_search').addEventListener('click', async function() {
    await loadApptsForOPD();
    showApptSuggestions(this.value);
});

document.getElementById('appt_search').addEventListener('input', function() {
    document.getElementById('appointment_id').value = '';
    showApptSuggestions(this.value);
});

document.addEventListener('click', function(e) {
    var box = document.getElementById('appt_suggestions');
    if (e.target.id !== 'appt_search' && box) box.style.display = 'none';
});

function saveOriginal() {
    original = {
        appointment_id:      document.getElementById('appointment_id').value,
        chief_complaint:     document.getElementById('chief_complaint').value,
        diagnosis:           document.getElementById('diagnosis').value,
        prescription_notes:  document.getElementById('prescription_notes').value
    };
}

function hasChanged() {
    return (
        document.getElementById('appointment_id').value     !== original.appointment_id     ||
        document.getElementById('chief_complaint').value    !== original.chief_complaint    ||
        document.getElementById('diagnosis').value          !== original.diagnosis          ||
        document.getElementById('prescription_notes').value !== original.prescription_notes
    );
}

function isUpdateMode() {
    return document.getElementById('save_btn').innerText === 'Update';
}

async function fillForm(v) {
    clearErrors();
    document.getElementById('opd_visit_id').value       = v.opd_visit_id;
    document.getElementById('appointment_id').value     = String(v.appointment_id);

    if (appts.length === 0) await loadApptsForOPD();
    var foundAppt = appts.find(function(a) { return String(a[0]) === String(v.appointment_id); });
    if (foundAppt) {
        var fullName = foundAppt[1] + (foundAppt[2] ? ' ' + foundAppt[2] : '');
        document.getElementById('appt_search').value = foundAppt[0] + ' - ' + fullName + ' (' + (foundAppt[4] || '') + ')';
    } else {
        document.getElementById('appt_search').value = 'Appointment ' + v.appointment_id;
    }

    document.getElementById('chief_complaint').value    = v.chief_complaint    || '';
    document.getElementById('diagnosis').value          = v.diagnosis          || '';
    document.getElementById('prescription_notes').value = v.prescription_notes || '';
    setVisitLocked(true);
    setIdReadonly(true);
    saveOriginal();
    updateNextBtnState();
    setToggleActive('Find');

    try {
        var res = await fetch('/opd/previous/' + v.opd_visit_id);
        var data = await res.json();
        document.getElementById('prev_btn').disabled = !data.found;
    } catch (e) {
        document.getElementById('prev_btn').disabled = false;
    }
}

function updateNextBtnState() {
    document.getElementById('next_btn').disabled = document.getElementById('new_btn').classList.contains('active');
}

async function resetToNew() {
    clearErrors();
    document.getElementById('appointment_id').value     = '';
    document.getElementById('appt_search').value        = '';
    document.getElementById('chief_complaint').value    = '';
    document.getElementById('diagnosis').value          = '';
    document.getElementById('prescription_notes').value = '';
    setVisitLocked(false);
    setIdReadonly(true);
    setToggleActive('New');
    document.getElementById('prev_btn').disabled = false;
    setMsg('', 'green');
    await fetchNextId();
}

(async function() {
    await loadApptsForOPD();
    await resetToNew();
})();

document.getElementById('appointment_id').addEventListener('change', async function() {
    var apptId = this.value;
    if (!apptId) return;

    if (isUpdateMode()) return;

    try {
        var res = await fetch('/opd/by-appointment/' + apptId);
        var data = await res.json();
        if (data.found) {
            setMsg('Warning: OPD visit already exists for this appointment (Visit #' + data.opd_visit_id + '). Pick a different one.', 'red');
        } else {
            setMsg('', 'green');
        }
    } catch (e) {}
});

document.getElementById('find_btn').addEventListener('click', async function() {
    var idField = document.getElementById('opd_visit_id');
    setToggleActive('Find');

    if (idField.readOnly) {
        idField.value = '';
        setIdReadonly(false);
        idField.focus();
        setMsg('Enter an OPD Visit ID to search.', 'green');
        return;
    }

    var idVal = idField.value.trim();
    if (idVal === '' || isNaN(idVal)) {
        setMsg('Please enter a valid OPD Visit ID!', 'red', 2500);
        return;
    }

    try {
        var res = await fetch('/opd/' + idVal);
        var result = await res.json();
        if (result.found) {
            await fillForm(result.opd_visit);
        } else {
            setMsg('No OPD visit found with that ID.', 'red', 2500);
            await resetToNew();
        }
    } catch (e) {
        setMsg('Error fetching OPD visit.', 'red', 2500);
    }
});

document.getElementById('opd_visit_id').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('find_btn').click();
    }
});

document.getElementById('new_btn').addEventListener('click', async function() {
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(resetToNew);
    } else {
        await resetToNew();
    }
});

document.getElementById('save_btn').addEventListener('click', async function() {
    await submitForm();
});

async function submitForm() {
    var apptSel   = document.getElementById('appointment_id');
    var apptSearch= document.getElementById('appt_search');
    var complaint = document.getElementById('chief_complaint');
    var diagnosis = document.getElementById('diagnosis');

    var emptyFields = [];
    [apptSearch, complaint, diagnosis].forEach(function(f) {
        if (!f.value || f.value.trim() === '') {
            emptyFields.push(f);
            markFieldError(f);
        }
    });

    if (emptyFields.length > 0) {
        setMsg('Please fill in all required fields.', 'red', 2500);
        emptyFields[0].focus();
        return false;
    }

    if (!apptSel.value || apptSel.value.trim() === '') {
        markFieldError(apptSearch);
        setMsg('Please select an appointment from the suggestion list.', 'red', 2500);
        apptSearch.focus();
        return false;
    }

    var isUpdate = isUpdateMode();
    if (isUpdate && !hasChanged()) {
        setMsg('No changes made to update.', 'red', 2500);
        return false;
    }

    var payload = {
        opd_visit_id:       parseInt(document.getElementById('opd_visit_id').value),
        appointment_id:     parseInt(apptSel.value),
        chief_complaint:    complaint.value.trim(),
        diagnosis:          diagnosis.value.trim(),
        prescription_notes: document.getElementById('prescription_notes').value.trim()
    };

    var url = isUpdate ? '/opd/' + payload.opd_visit_id : '/opd';
    var method = isUpdate ? 'PUT' : 'POST';

    try {
        var res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var reply = await res.json();

        if (reply.success) {
            setMsg('OPD visit saved successfully!', 'green');
            if (!isUpdate) {
                await resetToNew();
            } else {
                saveOriginal();
            }
            return true;
        } else {
            setMsg(reply.error || 'Failed to save OPD visit.', 'red', 2500);
            return false;
        }
    } catch (e) {
        setMsg('Server error while saving.', 'red', 2500);
        return false;
    }
}

function showUnsavedDialog(action) {
    pendingNav = action;
    document.getElementById('unsaved_modal').showModal();
}

document.getElementById('unsaved_save_btn').addEventListener('click', async function() {
    var saved = await submitForm();
    document.getElementById('unsaved_modal').close();
    if (saved && pendingNav) await pendingNav();
    pendingNav = null;
});

document.getElementById('unsaved_discard_btn').addEventListener('click', async function() {
    document.getElementById('unsaved_modal').close();
    if (pendingNav) {
        await pendingNav();
        pendingNav = null;
    }
});

document.getElementById('unsaved_cancel_btn').addEventListener('click', function() {
    document.getElementById('unsaved_modal').close();
    pendingNav = null;
});

async function doNext() {
    var currentId = document.getElementById('opd_visit_id').value;
    try {
        var res = await fetch('/opd/next/' + currentId);
        var data = await res.json();
        if (data.found) {
            await fillForm(data.opd_visit);
        } else {
            await resetToNew();
            setMsg('Reached end of records. Switched to New mode.', 'green', 2500);
        }
    } catch (e) {}
}

async function doPrev() {
    var currentId = document.getElementById('opd_visit_id').value;
    try {
        var res = await fetch('/opd/previous/' + currentId);
        var data = await res.json();
        if (data.found) {
            await fillForm(data.opd_visit);
        } else {
            setMsg('You are already on the first record.', 'red', 2500);
        }
    } catch (e) {}
}

document.getElementById('next_btn').addEventListener('click', async function() {
    if (document.getElementById('new_btn').classList.contains('active')) {
        setMsg('You are already in new form mode.', 'red', 2500);
        return;
    }
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(doNext);
    } else {
        await doNext();
    }
});

document.getElementById('prev_btn').addEventListener('click', async function() {
    if (isUpdateMode() && hasChanged()) {
        showUnsavedDialog(doPrev);
    } else {
        await doPrev();
    }
});

document.getElementById('exit_btn').addEventListener('click', function() {
    window.location.href = '/master-forms/index.html';
});

document.querySelectorAll('.info-icon').forEach(function(icon) {
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        var helpText = this.getAttribute('data-help');
        if (helpText) showModal(helpText);
    });
});
