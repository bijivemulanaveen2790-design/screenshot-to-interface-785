# Road Damage Reporting — Roadmap

- [x] Backend: complaints, photos, AI results, status history, assignments, notifications, roles (RLS)
- [x] Sign-in (email/password, Google, Lovable) + password reset
- [x] Citizen: dashboard, report (photos, camera, GPS/map/manual location), my complaints, details, notifications, help
- [x] Inspector: dashboard, all complaints (filters), map, inspection queue, details (review AI, notes, team, status, after-repair photo), repairs, resolved
- [x] Admin: grant/revoke inspector access
- [x] AI: FastAPI/YOLO hook with "AI analysis unavailable" fallback + documented severity score (tested)
- [x] Demo records clearly labelled
- [x] End-to-end workflow check (citizen → inspector → resolved)
- [ ] Blocked: real AI model server address (user to supply AI_DETECTION_URL)
- [ ] Optional: email/SMS notifications (needs a provider)
