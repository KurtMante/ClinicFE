import React, { useState, useEffect } from 'react';
import './DoctorSchedule.css';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:3000') + '/api/schedule';

const statusApiToUi = (s) => {
  switch (s) {
    case 'AVAILABLE': return 'Available';
    case 'UNAVAILABLE': return 'Unavailable';
    case 'HALF_DAY': return 'Half-Day';
    case 'DAY_OFF': return 'Day-off';
    default: return 'Available';
  }
};
const statusUiToApi = (s) => {
  switch (s) {
    case 'Available': return 'AVAILABLE';
    case 'Unavailable': return 'UNAVAILABLE';
    case 'Half-Day': return 'HALF_DAY';
    case 'Day-off': return 'DAY_OFF';
    default: return 'AVAILABLE';
  }
};

const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const to12 = (t) => {
  if (!t) return '';
  const [H,M] = t.split(':');
  if (M === undefined) return '';
  let h = parseInt(H,10);
  const ampm = h >= 12 ? 'PM':'AM';
  h = h % 12 || 12;
  return `${h}:${M} ${ampm}`;
};

const toApiTime = (v) => v ? `${v}:00` : null;

const DoctorSchedule = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [editFormData, setEditFormData] = useState({
    startTime: '',
    endTime: '',
    status: 'Available'
  });

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteWeekday, setNoteWeekday] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(API_BASE);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log('Schedule API data:', data); // debug
        const mapped = data.map(r => {
          const start = r.start_time || r.startTime;
          const end = r.end_time || r.endTime;
          return {
            weekday: r.weekday,
            day: dayNames[r.weekday],
            time: (r.status === 'DAY_OFF' || r.status === 'UNAVAILABLE' || !start || !end)
              ? ''
              : `${to12(start)} - ${to12(end)}`,
            status: statusApiToUi(r.status),
            raw: r,
            notes: r.notes ? r.notes.split('\n') : []
          };
        });
        setScheduleData(mapped);
        setNotes(mapped.flatMap(d => d.notes));
      } catch (e) {
        setLoadError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const refreshOne = async () => {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      const mapped = data.map(r => {
        const start = r.start_time || r.startTime;
        const end = r.end_time || r.endTime;
        return {
          weekday: r.weekday,
          day: dayNames[r.weekday],
          time: (r.status === 'DAY_OFF' || r.status === 'UNAVAILABLE' || !start || !end)
            ? ''
            : `${to12(start)} - ${to12(end)}`,
          status: statusApiToUi(r.status),
          raw: r,
          notes: r.notes ? r.notes.split('\n') : []
        };
      });
      setScheduleData(mapped);
      setNotes(mapped.flatMap(d => d.notes));
    } catch (_) {}
  };

  const handleEditSchedule = (index) => {
    const schedule = scheduleData[index];
    setSelectedDay({ ...schedule, index });

    if (schedule.time && schedule.time !== '' && schedule.time.includes(' - ')) {
      const [startTime, endTime] = schedule.time.split(' - ').map(s => s.trim());
      const convertTo24Hour = (time12h) => {
        if (!time12h) return '';
        const parts = time12h.split(' ');
        if (parts.length < 2) return '';
        const [time, modifier] = parts;
        let [hours, minutes] = time.split(':');
        if (!hours || minutes === undefined) return '';
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = (parseInt(hours,10) + 12).toString().padStart(2,'0');
        return `${hours}:${minutes}`;
      };
      setEditFormData({
        startTime: convertTo24Hour(startTime),
        endTime: convertTo24Hour(endTime),
        status: schedule.status
      });
    } else {
      setEditFormData({
        startTime: '',
        endTime: '',
        status: schedule.status
      });
    }
    setIsEditModalOpen(true);
  };

  const handleMarkUnavailable = async (index) => {
    const item = scheduleData[index];
    const nextStatus = item.status === 'Available' ? 'Unavailable' : 'Available';
    setSaving(true);
    try {
      const body = {
        status: statusUiToApi(nextStatus),
        start_time: nextStatus === 'Available' ? '08:00:00' : null,
        end_time: nextStatus === 'Available' ? '17:00:00' : null
      };
      const res = await fetch(`${API_BASE}/${item.weekday}/status`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Update failed');
      await refreshOne(item.weekday);
    } catch (e) {
      // optionally set error state
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedDay) return;
    const needsTime = !(editFormData.status === 'Day-off' || editFormData.status === 'Unavailable');
    if (needsTime && (!editFormData.startTime || !editFormData.endTime)) {
      // simple client validation
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: statusUiToApi(editFormData.status),
        start_time: needsTime ? toApiTime(editFormData.startTime) : null,
        end_time: needsTime ? toApiTime(editFormData.endTime) : null
      };
      const res = await fetch(`${API_BASE}/${selectedDay.weekday}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
      await refreshOne(selectedDay.weekday);
    } catch (e) {
      // handle error
    } finally {
      setSaving(false);
      setIsEditModalOpen(false);
      setSelectedDay(null);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/${noteWeekday}/notes`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ note: newNote.trim() })
      });
      if (!res.ok) throw new Error('Add note failed');
      await refreshOne(noteWeekday);
      setNewNote('');
      setIsNotesModalOpen(false);
    } catch (e) {
      // handle
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'status-available';
      case 'Half-Day': return 'status-half-day';
      case 'Day-off': return 'status-day-off';
      case 'Unavailable': return 'status-unavailable';
      default: return 'status-available';
    }
  };

  const statusQuickDefaults = {
    AVAILABLE: { start_time: '08:00:00', end_time: '17:00:00' },
    HALF_DAY: { start_time: '08:00:00', end_time: '12:00:00' }
  };

  const handleStatusSelect = async (index, uiValue) => {
    const item = scheduleData[index];
    setSaving(true);
    try {
      const apiStatus = statusUiToApi(uiValue);
      const def = statusQuickDefaults[apiStatus];
      const body = {
        status: apiStatus,
        start_time: def ? def.start_time : null,
        end_time: def ? def.end_time : null
      };
      const res = await fetch(`${API_BASE}/${item.weekday}/status`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Update failed');
      await refreshOne();
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="doctor-schedule-container"><p>Loading schedule...</p></div>;
  }
  if (loadError) {
    return <div className="doctor-schedule-container"><p>Error: {loadError}</p></div>;
  }

  return (
    <div className="doctor-schedule-container">
      <div className="schedule-header">
        <h1>Manage Doctor Schedule</h1>
        <button
          className="add-notes-btn"
          onClick={() => {
            setNoteWeekday(0);
            setIsNotesModalOpen(true);
          }}
        >
          Add Note
        </button>
      </div>

      <div className="schedule-table-container">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>DAY</th>
              <th>TIME</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {scheduleData.map((schedule, index) => (
              <tr key={schedule.day}>
                <td>{schedule.day}</td>
                <td>{schedule.time}</td>
                <td>
                  <span className={`status-badge ${getStatusColor(schedule.status)}`}>
                    {saving && selectedDay?.index === index ? '...' : schedule.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-link edit-link"
                      onClick={() => handleEditSchedule(index)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <select
                      className="status-select"
                      value={schedule.status}
                      onChange={(e) => handleStatusSelect(index, e.target.value)}
                      disabled={saving}
                    >
                      <option value="Available">Available</option>
                      <option value="Half-Day">Half-Day</option>
                      <option value="Day-off">Day-off</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                    {/* Removed per-row Add Note button; use top Add Note */}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notes-section">
        <h3>NOTES:</h3>
        <ul className="notes-list">
          {notes.map((note, i) => (
            <li key={i} className="note-item">
              <span className="note-bullet">●</span>
              <span className="note-text">{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {isEditModalOpen && selectedDay && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setIsEditModalOpen(false)}
            >
              ×
            </button>
            <div className="modal-header">
              <h3>Edit Schedule - {selectedDay.day}</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="form-control"
                >
                  <option value="Available">Available</option>
                  <option value="Half-Day">Half-Day</option>
                  <option value="Day-off">Day-off</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              {!(editFormData.status === 'Day-off' || editFormData.status === 'Unavailable') && (
                <>
                  <div className="form-group">
                    <label htmlFor="startTime">Start Time</label>
                    <input
                      type="time"
                      id="startTime"
                      value={editFormData.startTime}
                      onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="endTime">End Time</label>
                    <input
                      type="time"
                      id="endTime"
                      value={editFormData.endTime}
                      onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                      className="form-control"
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  className="btn btn-cancel"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-save"
                  onClick={handleSaveSchedule}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isNotesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNotesModalOpen(false)}>
          <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setIsNotesModalOpen(false)}
            >
              ×
            </button>
            <div className="modal-header">
              <h3>Add Note</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="noteDay">Day</label>
                <select
                  id="noteDay"
                  value={noteWeekday}
                  onChange={(e) => setNoteWeekday(Number(e.target.value))}
                  className="form-control"
                >
                  {dayNames.map((d,i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="newNote">Note</label>
                <textarea
                  id="newNote"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter a note about the doctor's schedule..."
                  className="form-control"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-cancel"
                  onClick={() => setIsNotesModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-save"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || saving}
                >
                  {saving ? 'Adding...' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorSchedule;
