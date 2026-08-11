from flask import Flask, request, jsonify
import oracledb
import ssl

app = Flask(__name__, static_folder='public', static_url_path='')

DB_USER = "KHANMDMOHSIN1802_SCHEMA_W2BSC"
DB_PASS = "REPLACE_WITH_YOUR_DATABASE_PASSWORD"
DB_CONN = "tcps://db.freesql.com:2484/26ai_un3c1"

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    pool = oracledb.create_pool(user=DB_USER, password=DB_PASS, dsn=DB_CONN, ssl_context=ctx, min=2, max=10, increment=1)
except Exception as e:
    pool = None
    print("DB pool error:", e)


def get_db_connection():
    return pool.acquire()


@app.route('/')
def home():
    return app.send_static_file('master-forms/index.html')


@app.route('/patients', methods=['GET'])
def get_patients():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT patient_id, first_name, last_name FROM MST_PATIENT ORDER BY patient_id")
        rows = cursor.fetchall()
        lst = [{"patient_id": r[0], "first_name": r[1], "last_name": r[2]} for r in rows]
        return jsonify({"success": True, "list": lst})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


@app.route('/api/list-patients', methods=['GET'])
def list_patients():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT uhid, first_name, last_name, mobile_no, patient_id FROM MST_PATIENT ORDER BY patient_id")
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()



@app.route('/doctors', methods=['GET'])
def get_doctors():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT doctor_id, doctor_name, specialization FROM MST_DOCTOR WHERE status = 1 ORDER BY doctor_id")
        rows = cursor.fetchall()
        lst = [{"doctor_id": r[0], "doctor_name": r[1], "specialization": r[2]} for r in rows]
        return jsonify({"success": True, "list": lst})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


@app.route('/api/list-doctors', methods=['GET'])
def list_doctors():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT doctor_code, doctor_name, specialization, doctor_id FROM MST_DOCTOR WHERE status = 1 ORDER BY doctor_id")
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


@app.route('/beds', methods=['GET'])
def get_beds():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT bed_id, ward_name, bed_number, bed_type FROM MST_BED ORDER BY bed_id")
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


@app.route('/api/get-lov', methods=['GET'])
def get_lov():
    lov_type = request.args.get('type')
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT lov_value, lov_value FROM MST_LOV WHERE lov_type = :1 AND is_active = 'Y' ORDER BY lov_id", [lov_type])
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()



@app.route('/appointment/next-id', methods=['GET'])
def appointment_next_id():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT NVL(MAX(appointment_id), 0) + 1 FROM TRN_APPOINTMENT")
        next_id = cursor.fetchone()[0]
        return jsonify({"success": True, "next_id": next_id})
    except Exception as e:
        return jsonify({"success": False, "next_id": 1})
    finally:
        if conn:
            conn.close()


@app.route('/appointment/booked-slots', methods=['GET'])
def booked_slots():
    doctor_id = request.args.get('doctor_id')
    date_val = request.args.get('date')
    exclude_id = request.args.get('exclude_id')
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = """
            SELECT TO_CHAR(appointment_datetime, 'HH24:MI') FROM TRN_APPOINTMENT
            WHERE doctor_id = :1 AND TRUNC(appointment_datetime) = TO_DATE(:2, 'YYYY-MM-DD') AND status != 'Cancelled'
        """
        params = [doctor_id, date_val]
        if exclude_id:
            sql += " AND appointment_id != :3"
            params.append(exclude_id)
        cursor.execute(sql, params)
        booked = [r[0] for r in cursor.fetchall()]
        return jsonify({"success": True, "booked_slots": booked})
    except Exception as e:
        return jsonify({"success": False, "booked_slots": []})
    finally:
        if conn:
            conn.close()


def appointment_to_dict(row):
    return {
        "appointment_id": row[0],
        "patient_id": row[1],
        "doctor_id": row[2],
        "appointment_datetime": row[3],
        "status": row[4]
    }


@app.route('/appointment/<int:appt_id>', methods=['GET'])
def get_appointment(appt_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT appointment_id, patient_id, doctor_id,
                   TO_CHAR(appointment_datetime, 'YYYY-MM-DD HH24:MI'), status
            FROM TRN_APPOINTMENT WHERE appointment_id = :1
        """, [appt_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "appointment": appointment_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/appointment/next/<int:appt_id>', methods=['GET'])
def next_appointment(appt_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT appointment_id, patient_id, doctor_id,
                   TO_CHAR(appointment_datetime, 'YYYY-MM-DD HH24:MI'), status
            FROM TRN_APPOINTMENT WHERE appointment_id > :1
            ORDER BY appointment_id ASC FETCH FIRST 1 ROWS ONLY
        """, [appt_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "appointment": appointment_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/appointment/previous/<int:appt_id>', methods=['GET'])
def previous_appointment(appt_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT appointment_id, patient_id, doctor_id,
                   TO_CHAR(appointment_datetime, 'YYYY-MM-DD HH24:MI'), status
            FROM TRN_APPOINTMENT WHERE appointment_id < :1
            ORDER BY appointment_id DESC FETCH FIRST 1 ROWS ONLY
        """, [appt_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "appointment": appointment_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/appointment', methods=['POST'])
def save_appointment():
    data = request.json
    try:
        patient_id = int(data.get('patient_id'))
        doctor_id = int(data.get('doctor_id'))
        appointment_datetime = data.get('appointment_datetime')
        status = data.get('status', 'Booked')
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid appointment data."})

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*) FROM TRN_APPOINTMENT
            WHERE doctor_id = :1
            AND TO_CHAR(appointment_datetime, 'YYYY-MM-DD HH24:MI') = :2
            AND status != 'Cancelled'
        """, [doctor_id, appointment_datetime])
        already_booked = cursor.fetchone()[0]
        if already_booked > 0:
            return jsonify({"success": False, "error": "This doctor already has an appointment at that date and time."})

        cursor.execute("SELECT NVL(MAX(appointment_id), 0) + 1 FROM TRN_APPOINTMENT")
        new_id = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO TRN_APPOINTMENT (appointment_id, patient_id, doctor_id, appointment_datetime, status)
            VALUES (:1, :2, :3, TO_DATE(:4, 'YYYY-MM-DD HH24:MI'), :5)
        """, [new_id, patient_id, doctor_id, appointment_datetime, status])
        conn.commit()
        return jsonify({"success": True, "appointment_id": new_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/appointment/<int:appt_id>', methods=['PUT'])
def update_appointment(appt_id):
    data = request.json
    try:
        patient_id = int(data.get('patient_id'))
        doctor_id = int(data.get('doctor_id'))
        appointment_datetime = data.get('appointment_datetime')
        status = data.get('status')
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid appointment data."})

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE TRN_APPOINTMENT
            SET patient_id = :1, doctor_id = :2,
                appointment_datetime = TO_DATE(:3, 'YYYY-MM-DD HH24:MI'), status = :4
            WHERE appointment_id = :5
        """, [patient_id, doctor_id, appointment_datetime, status, appt_id])
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        if conn:
            conn.close()



@app.route('/appointments', methods=['GET'])
def get_appointments():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT a.appointment_id, p.first_name, p.last_name, p.uhid,
                   d.doctor_name,
                   TO_CHAR(a.appointment_datetime, 'YYYY-MM-DD HH24:MI')
            FROM TRN_APPOINTMENT a
            JOIN MST_PATIENT p ON a.patient_id = p.patient_id
            JOIN MST_DOCTOR d ON a.doctor_id = d.doctor_id
            WHERE a.status = 'Booked'
            ORDER BY a.appointment_id DESC
        """)
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


def opd_to_dict(row):
    return {
        "opd_visit_id": row[0],
        "appointment_id": row[1],
        "chief_complaint": row[2],
        "diagnosis": row[3],
        "prescription_notes": row[4]
    }


@app.route('/opd/next-id', methods=['GET'])
def opd_next_id():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT NVL(MAX(opd_visit_id), 0) + 1 FROM TRN_OPD_VISIT")
        next_id = cursor.fetchone()[0]
        return jsonify({"success": True, "next_id": next_id})
    except Exception as e:
        return jsonify({"success": False, "next_id": 1})
    finally:
        if conn:
            conn.close()


@app.route('/opd/by-appointment/<int:appt_id>', methods=['GET'])
def opd_by_appointment(appt_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT opd_visit_id FROM TRN_OPD_VISIT
            WHERE appointment_id = :1
            FETCH FIRST 1 ROWS ONLY
        """, [appt_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "opd_visit_id": row[0]})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/opd/<int:opd_id>', methods=['GET'])
def get_opd(opd_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT opd_visit_id, appointment_id, chief_complaint, diagnosis, prescription_notes
            FROM TRN_OPD_VISIT WHERE opd_visit_id = :1
        """, [opd_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "opd_visit": opd_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/opd/next/<int:opd_id>', methods=['GET'])
def next_opd(opd_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT opd_visit_id, appointment_id, chief_complaint, diagnosis, prescription_notes
            FROM TRN_OPD_VISIT WHERE opd_visit_id > :1
            ORDER BY opd_visit_id ASC FETCH FIRST 1 ROWS ONLY
        """, [opd_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "opd_visit": opd_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/opd/previous/<int:opd_id>', methods=['GET'])
def previous_opd(opd_id):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT opd_visit_id, appointment_id, chief_complaint, diagnosis, prescription_notes
            FROM TRN_OPD_VISIT WHERE opd_visit_id < :1
            ORDER BY opd_visit_id DESC FETCH FIRST 1 ROWS ONLY
        """, [opd_id])
        row = cursor.fetchone()
        if row:
            return jsonify({"found": True, "opd_visit": opd_to_dict(row)})
        return jsonify({"found": False})
    except Exception as e:
        return jsonify({"found": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/opd', methods=['POST'])
def save_opd():
    data = request.json
    try:
        appointment_id = int(data.get('appointment_id'))
        chief_complaint = data.get('chief_complaint')
        diagnosis = data.get('diagnosis')
        prescription_notes = data.get('prescription_notes')
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid OPD visit data."})

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM TRN_OPD_VISIT WHERE appointment_id = :1", [appointment_id])
        if cursor.fetchone()[0] > 0:
            return jsonify({"success": False, "error": "An OPD visit already exists for this appointment."})

        cursor.execute("SELECT NVL(MAX(opd_visit_id), 0) + 1 FROM TRN_OPD_VISIT")
        new_id = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO TRN_OPD_VISIT (opd_visit_id, appointment_id, chief_complaint, diagnosis, prescription_notes)
            VALUES (:1, :2, :3, :4, :5)
        """, [new_id, appointment_id, chief_complaint, diagnosis, prescription_notes])
        cursor.execute("""
            UPDATE TRN_APPOINTMENT SET status = 'Completed'
            WHERE appointment_id = :1 AND status != 'Cancelled'
        """, [appointment_id])
        conn.commit()
        return jsonify({"success": True, "opd_visit_id": new_id})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})
    finally:
        if conn:
            conn.close()


@app.route('/opd/<int:opd_id>', methods=['PUT'])
def update_opd(opd_id):
    return jsonify({
        "success": False,
        "error": "Completed OPD visits are locked and cannot be edited."
    }), 403
@app.route('/api/list-medicines', methods=['GET'])
def list_medicines():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT medicine_id, medicine_name, unit_price, reorder_level FROM MST_MEDICINE ORDER BY medicine_id DESC")
        rows = cursor.fetchall()
        return jsonify({"success": True, "list": rows})
    except Exception as e:
        return jsonify({"success": False, "list": []})
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    app.run(port=5001, debug=True, use_reloader=False)
