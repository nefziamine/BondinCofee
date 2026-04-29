# Chatbot Capabilities & Questions by Role

This document outlines the specific topics, keywords, and questions the Multi-Role Chatbot is currently programmed to recognize and answer, categorized by the active user's role.

## 🌍 1. VISITOR (Unauthenticated User)
The chatbot provides a welcoming experience and answers general, public-facing queries.
**Capabilities & Trigger Keywords:**
- **Greetings**: (`bonjour`, `salut`, `hi`, `hello`, `coucou`) → Warm welcome and platform introduction.
- **Platform Info**: What is this platform? What features are available?
- **Registration**: How do I create an account? How does the registration process work?
- **Security**: Is my data secure? Who is this platform intended for?
*(Note: Visitor chat history is purposefully **not saved** in the database to ensure privacy and clean data).*

## 📊 2. ADMIN (Platform Administrator)
The chatbot assists administrators with high-level overviews and system configurations.
**Capabilities & Trigger Keywords:**
- **Statistics & Reports**: (`stat`, `combien`, `rapport`) → Provides insights on dashboard data and analytics.
- **Ticket Management**: (`ticket`, `réclamation`) → Guides the admin to monitor or manage urgent tickets.
- **General System Management**: Helps with user account management, roles, and system workflows.

## 💼 3. HR (Human Resources)
The chatbot acts as a dedicated HR assistant to help staff manage employees efficiently.
**Capabilities & Trigger Keywords:**
- **Payroll & Salaries**: (`salaire`, `paie`, `prime`) → Information on payroll processing dates and tracking salary anomalies.
- **Leave Management**: (`congé`, `vacances`, `absence`) → Directs HR to approve/reject pending leave requests and check balances.
- **Documents & Onboarding**: (`attestation`, `document`, `recrutement`) → Assistance with generating work certificates and employee onboarding.

## 💻 4. IT (Information Technology Support)
The chatbot helps IT staff resolve technical issues and manage infrastructure.
**Capabilities & Trigger Keywords:**
- **Network & VPN**: (`vpn`, `réseau`, `wifi`, `accès`) → Guidance on VPN profiles, 2FA, and enterprise network configurations.
- **Hardware & Bug Tickets**: (`ticket`, `bug`, `problème`, `pc`, `ordinateur`) → Tracking bugs, hardware issues, and helpdesk resolutions.
- **Account & Passwords**: (`mot de passe`, `compte`, `email`, `mail`) → Troubleshooting Microsoft accounts, Outlook emails, and resetting passwords.

## 👥 5. EMPLOYEE (Standard Employee)
The chatbot serves as a personal assistant for daily work tasks and personal HR matters.
**Capabilities & Trigger Keywords:**
- **Leaves & Calendar**: (`congé`, `vacances`, `solde`) → Checking leave balances, submitting new leave requests, and reviewing the integrated calendar for public holidays.
- **Payslips**: (`salaire`, `paie`, `fiche`) → Viewing and downloading monthly payslips.
- **Internal Policies**: (`politique`, `annonce`, `absence`) → Checking company policies on absences and reading internal announcements.

---
**Universal Fallbacks (All Roles)**
- Password recovery detection (`forgot password`, `mot de passe oublié`, `نسيت كلمة المرور`) → Returns a step-by-step guide to resetting the password.
- Identity queries (`qui es-tu`, `tu es qui`, `nom`) → The chatbot introduces itself based on the user's role.
