// Simple internationalization system
export const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    
    // Settings page
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account settings and preferences',
    'settings.profile.title': 'Profile Information',
    'settings.profile.subtitle': 'Update your personal information',
    'settings.profile.firstName': 'First Name',
    'settings.profile.lastName': 'Last Name',
    'settings.profile.email': 'Email',
    'settings.profile.save': 'Save Profile',
    
    'settings.notifications.title': 'Notification Preferences',
    'settings.notifications.subtitle': 'Choose how you want to be notified about your projects',
    'settings.notifications.email': 'Email Notifications',
    'settings.notifications.emailDesc': 'Receive email updates about your account',
    'settings.notifications.parsing': 'Parsing Notifications',
    'settings.notifications.parsingDesc': 'Get notified when script parsing completes',
    'settings.notifications.marketing': 'Marketing Updates',
    'settings.notifications.marketingDesc': 'Receive updates about new features and promotions',
    'settings.notifications.save': 'Save Preferences',
    
    'settings.app.title': 'App Preferences',
    'settings.app.subtitle': 'Customize your application experience',
    'settings.app.theme': 'Theme',
    'settings.app.language': 'Language',
    'settings.app.timezone': 'Timezone',
    'settings.app.save': 'Save Preferences',
    
    // Toast messages
    'toast.preferencesUpdated': 'Preferences updated successfully',
    'toast.profileUpdated': 'Profile information has been saved',
    'toast.updateFailed': 'Update failed',
    'toast.saving': 'Saving...',
  },
  es: {
    // Navigation
    'nav.dashboard': 'Panel de Control',
    'nav.projects': 'Proyectos',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar Sesión',
    
    // Settings page
    'settings.title': 'Configuración',
    'settings.subtitle': 'Gestiona la configuración de tu cuenta y preferencias',
    'settings.profile.title': 'Información del Perfil',
    'settings.profile.subtitle': 'Actualiza tu información personal',
    'settings.profile.firstName': 'Nombre',
    'settings.profile.lastName': 'Apellido',
    'settings.profile.email': 'Correo Electrónico',
    'settings.profile.save': 'Guardar Perfil',
    
    'settings.notifications.title': 'Preferencias de Notificación',
    'settings.notifications.subtitle': 'Elige cómo quieres ser notificado sobre tus proyectos',
    'settings.notifications.email': 'Notificaciones por Email',
    'settings.notifications.emailDesc': 'Recibe actualizaciones por correo sobre tu cuenta',
    'settings.notifications.parsing': 'Notificaciones de Análisis',
    'settings.notifications.parsingDesc': 'Recibe notificaciones cuando se complete el análisis del guión',
    'settings.notifications.marketing': 'Actualizaciones de Marketing',
    'settings.notifications.marketingDesc': 'Recibe actualizaciones sobre nuevas características y promociones',
    'settings.notifications.save': 'Guardar Preferencias',
    
    'settings.app.title': 'Preferencias de la Aplicación',
    'settings.app.subtitle': 'Personaliza tu experiencia de aplicación',
    'settings.app.theme': 'Tema',
    'settings.app.language': 'Idioma',
    'settings.app.timezone': 'Zona Horaria',
    'settings.app.save': 'Guardar Preferencias',
    
    // Toast messages
    'toast.preferencesUpdated': 'Preferencias actualizadas con éxito',
    'toast.profileUpdated': 'La información del perfil ha sido guardada',
    'toast.updateFailed': 'Error al actualizar',
    'toast.saving': 'Guardando...',
  },
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de Bord',
    'nav.projects': 'Projets',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    
    // Settings page
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez les paramètres de votre compte et vos préférences',
    'settings.profile.title': 'Informations du Profil',
    'settings.profile.subtitle': 'Mettez à jour vos informations personnelles',
    'settings.profile.firstName': 'Prénom',
    'settings.profile.lastName': 'Nom de Famille',
    'settings.profile.email': 'Email',
    'settings.profile.save': 'Sauvegarder le Profil',
    
    'settings.notifications.title': 'Préférences de Notification',
    'settings.notifications.subtitle': 'Choisissez comment vous voulez être notifié de vos projets',
    'settings.notifications.email': 'Notifications Email',
    'settings.notifications.emailDesc': 'Recevez des mises à jour par email sur votre compte',
    'settings.notifications.parsing': 'Notifications d\'Analyse',
    'settings.notifications.parsingDesc': 'Soyez notifié quand l\'analyse du script est terminée',
    'settings.notifications.marketing': 'Mises à Jour Marketing',
    'settings.notifications.marketingDesc': 'Recevez des mises à jour sur les nouvelles fonctionnalités et promotions',
    'settings.notifications.save': 'Sauvegarder les Préférences',
    
    'settings.app.title': 'Préférences de l\'Application',
    'settings.app.subtitle': 'Personnalisez votre expérience d\'application',
    'settings.app.theme': 'Thème',
    'settings.app.language': 'Langue',
    'settings.app.timezone': 'Fuseau Horaire',
    'settings.app.save': 'Sauvegarder les Préférences',
    
    // Toast messages
    'toast.preferencesUpdated': 'Préférences mises à jour avec succès',
    'toast.profileUpdated': 'Les informations du profil ont été sauvegardées',
    'toast.updateFailed': 'Échec de la mise à jour',
    'toast.saving': 'Sauvegarde...',
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, language: Language = 'en'): string {
  return translations[language]?.[key] || translations.en[key] || key;
}

export function useTranslation(language: Language = 'en') {
  return {
    t: (key: TranslationKey) => t(key, language),
    language
  };
}