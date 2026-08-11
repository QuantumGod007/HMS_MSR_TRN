# HMS_MSR_TRN

## Hospital Management System Forms

## Forms

- `public/master-forms/` contains the patient, medicine, and LOV master forms.
- `public/transaction-forms/` contains the appointment and OPD visit transaction forms.

## Before running

Replace `REPLACE_WITH_YOUR_DATABASE_PASSWORD` in both `app.py` and `server.js` with the database password shared separately.

## Run

Start the master-form service with `npm start`, then start the transaction-form service with `python3 app.py`.

- Master forms: http://localhost:3000/master-forms/index.html
- Transaction forms: http://localhost:5001/transaction-forms/appointment.html
