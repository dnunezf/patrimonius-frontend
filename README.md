# Patrimonius Frontend

Frontend client for **Patrimonius**, the institutional electronic document and records management system developed for the Museo Nacional de Costa Rica.  
The frontend provides the user interface for all system roles (Administrator, Editor, Archivist, User, External), enabling secure access to the document lifecycle, aligned with national (Law 7202, Law 8454) and international archival standards (OAIS, METS, PREMIS, ISO 15489, ISO 23081).

---

## Tech Stack
- **Framework:** Angular (latest LTS)  
- **Styling:** Tailwind CSS (with PostCSS plugins)  
- **UI/UX:** Based on Museo Nacional’s official branding guide  
- **Testing:** Jest (unit/integration)  
- **Version Control:** Git + GitHub  

---


---

## Core Features
- **Role-based Dashboards** for Administrators, Editors, Archivists, and Users.  
- **User & Role Management (HU-001):** Interface to create, edit, delete users and assign permissions.  
- **Access Control (HU-002 – HU-006):** Confidentiality level indicators and restricted access screens.  
- **Document Production (HU-007 – HU-018):** Create, edit, collaborate, and digitally sign documents.  
- **Archival & Conservation (HU-019 – HU-032):** Interfaces for classification, retention schedules, and transfer.  
- **Search & Consultation (HU-024 – HU-028):** Search bar, filters, previews, and downloads.  
- **Interoperability (HU-033 – HU-034):** Export tools for SIP packages.  
- **Accessibility:** WCAG 2.1 AA compliance, responsive design, and high-contrast mode.  

---

## Installation & Setup
### Prerequisites
- Node.js >= 18.x  
- Angular CLI >= 18.x  
- Git  

### Clone Repository
```bash
git clone https://github.com/<your-org>/patrimonius-frontend.git
cd patrimonius-frontend
```
### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
ng serve
```

### Build for Production
```bash
ng build --configuration production
```

### Testing
```bash
npm test
```

---

## Contributors

- David Núñez Franco
- María Araya Campos
- Gabriel Herrera Solís
- Alexia Alvarado Alfaro
- Kendra Artavia Caballero
- William Rodríguez Campos

---
