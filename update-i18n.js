const fs = require('fs');

const langs = ['fr', 'en', 'ar'];

const additions = {
  fr: {
    ADMIN: {
      TITLE: "Gestion des Talents",
      SUBTITLE: "Administration globale des accès et des rôles de la Maison.",
      NEW_USER: "Nouveau Collaborateur",
      NAME: "Nom complet",
      EMAIL: "Email",
      ROLE: "Rôle",
      STATUS: "Statut",
      ARRIVAL: "Arrivée",
      ACTIONS: "Actions",
      REVOKE: "Révoquer",
      EMPTY: "Aucun utilisateur trouvé.",
      SEARCH_PLACEHOLDER: "Rechercher...",
      ALL_ROLES: "Tous les rôles",
      KPI: {
        ACTIVE: "Comptes Actifs",
        OPEN_TICKETS: "Tickets Ouverts",
        RESOLVED: "Tickets Résolus",
        RESPONSE_TIME: "Temps Moy. Rép"
      }
    },
    REQ: {
      TITLE: "Tableau des Requêtes",
      QUESTIONS: "Questions",
      RECLAMATIONS: "Réclamations",
      SUBJ: "Sujet",
      CAT: "Catégorie",
      DET: "Détails",
      BTN_NEW: "Soumettre la Requête",
      EMP_EMPTY: "Aucun élément trouvé.",
      PROGRESS: "Mettre en cours",
      RESOLVED: "Marquer résolu",
      REROUTE: "Re-router"
    },
    PROF: {
      TITLE: "Mon Profil Employé",
      BACK: "Retour Menu",
      NAME: "Nom complet",
      EMAIL: "Email",
      DEPT: "Département",
      JOB: "Poste Assigné",
      TEL: "Téléphone",
      EXP: "Expérience",
      EDIT_PIC: "Mettre à jour la photo",
      INIT: "Initialiser votre profil",
      INIT_TXT: "Veuillez remplir vos informations pour les systèmes internes Bondin.",
      EXP_DESC: "Description de l'expérience...",
      SAVE: "Enregistrer le Profil"
    },
    PROF_C: {
      TITLE: "Nouveau Profil",
      CANCEL: "Annuler",
      FINISH: "Finaliser l'inscription",
      SUMM: "Récapitulatif Expérience"
    },
    PWD: {
      FORGOT: "Mot de passe oublié",
      INSTR: "Entrez votre email pour recevoir un lien de réinitialisation.",
      INVALID: "Email invalide",
      SEND: "Envoyer le lien",
      SENDING: "Envoi...",
      BACK: "Retour à la connexion"
    },
    CHAT: {
      ONLINE: "En ligne",
      WELCOME: "Bienvenue dans la Maison Bondin. Je suis votre assistant dédié.",
      PLACEHOLDER: "Écrivez votre message..."
    }
  },
  en: {
    ADMIN: {
      TITLE: "Talent Management",
      SUBTITLE: "Global administration of access and roles in the House.",
      NEW_USER: "New Collaborator",
      NAME: "Full Name",
      EMAIL: "Email",
      ROLE: "Role",
      STATUS: "Status",
      ARRIVAL: "Arrival",
      ACTIONS: "Actions",
      REVOKE: "Revoke",
      EMPTY: "No users found.",
      SEARCH_PLACEHOLDER: "Search...",
      ALL_ROLES: "All roles",
      KPI: {
        ACTIVE: "Active Accounts",
        OPEN_TICKETS: "Open Tickets",
        RESOLVED: "Resolved Tickets",
        RESPONSE_TIME: "Avg. Response Time"
      }
    },
    REQ: {
      TITLE: "Requests Request",
      QUESTIONS: "Questions",
      RECLAMATIONS: "Complaints",
      SUBJ: "Subject",
      CAT: "Category",
      DET: "Details",
      BTN_NEW: "Submit Request",
      EMP_EMPTY: "No items found.",
      PROGRESS: "Set to Progress",
      RESOLVED: "Mark Resolved",
      REROUTE: "Re-route"
    },
    PROF: {
      TITLE: "My Employee Profile",
      BACK: "Back to Menu",
      NAME: "Full name",
      EMAIL: "Email",
      DEPT: "Department",
      JOB: "Assigned Job",
      TEL: "Phone Number",
      EXP: "Experience",
      EDIT_PIC: "Update photo",
      INIT: "Initialize your profile",
      INIT_TXT: "Please complete your information for internal Bondin systems.",
      EXP_DESC: "Experience description...",
      SAVE: "Save Profile"
    },
    PROF_C: {
      TITLE: "New Profile",
      CANCEL: "Cancel",
      FINISH: "Finalize Registration",
      SUMM: "Experience Summary"
    },
    PWD: {
      FORGOT: "Forgot password",
      INSTR: "Enter your email to receive a reset link.",
      INVALID: "Invalid email",
      SEND: "Send link",
      SENDING: "Sending...",
      BACK: "Back to login"
    },
    CHAT: {
      ONLINE: "Online",
      WELCOME: "Welcome to Maison Bondin. I am your dedicated assistant.",
      PLACEHOLDER: "Type your message..."
    }
  },
  ar: {
    ADMIN: {
      TITLE: "إدارة المواهب",
      SUBTITLE: "الإدارة الشاملة للوصول والأدوار في الدار.",
      NEW_USER: "متعاون جديد",
      NAME: "الاسم الكامل",
      EMAIL: "البريد الإلكتروني",
      ROLE: "الدور",
      STATUS: "الحالة",
      ARRIVAL: "تاريخ الانضمام",
      ACTIONS: "إجراءات",
      REVOKE: "سحب الصلاحية",
      EMPTY: "لا يوجد مستخدمين.",
      SEARCH_PLACEHOLDER: "بحث...",
      ALL_ROLES: "جميع الأدوار",
      KPI: {
        ACTIVE: "الحسابات النشطة",
        OPEN_TICKETS: "التذاكر المفتوحة",
        RESOLVED: "التذاكر المحلولة",
        RESPONSE_TIME: "متوسط وقت الرد"
      }
    },
    REQ: {
      TITLE: "جدول الطلبات",
      QUESTIONS: "أسئلة",
      RECLAMATIONS: "شكاوى",
      SUBJ: "الموضوع",
      CAT: "الفئة",
      DET: "التفاصيل",
      BTN_NEW: "إرسال الطلب",
      EMP_EMPTY: "لا توجد عناصر.",
      PROGRESS: "قيد التقدم",
      RESOLVED: "مكتمل",
      REROUTE: "إعادة توجيه"
    },
    PROF: {
      TITLE: "ملفي الشخصي",
      BACK: "العودة للقائمة",
      NAME: "الاسم الكامل",
      EMAIL: "البريد الإلكتروني",
      DEPT: "القسم",
      JOB: "الوظيفة المخصصة",
      TEL: "الهاتف",
      EXP: "الخبرة",
      EDIT_PIC: "تحديث الصورة",
      INIT: "تهيئة ملفك الشخصي",
      INIT_TXT: "يرجى إكمال بياناتك للأنظمة الداخلية.",
      EXP_DESC: "وصف الخبرة...",
      SAVE: "حفظ الملف"
    },
    PROF_C: {
      TITLE: "ملف جديد",
      CANCEL: "إلغاء",
      FINISH: "إتمام التسجيل",
      SUMM: "ملخص الخبرة"
    },
    PWD: {
      FORGOT: "نسيت كلمة المرور",
      INSTR: "أدخل بريدك الإلكتروني لتلقي رابط إستعادة.",
      INVALID: "بريد إلكتروني غير صالح",
      SEND: "إرسال الرابط",
      SENDING: "جاري الإرسال...",
      BACK: "العودة لتسجيل الدخول"
    },
    CHAT: {
      ONLINE: "متصل",
      WELCOME: "مرحبًا بك في دار بن يدر. أنا المساعد الخاص بك.",
      PLACEHOLDER: "اكتب رسالتك..."
    }
  }
};

for (const lang of langs) {
  const filePath = `frontend/src/assets/i18n/${lang}.json`;
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge new objects
    Object.assign(data, additions[lang]);
    
    // Remove <br> from HEADLINE
    if (data.LANDING && data.LANDING.HEADLINE) {
      data.LANDING.HEADLINE = data.LANDING.HEADLINE.replace(/<br>/g, '');
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}
