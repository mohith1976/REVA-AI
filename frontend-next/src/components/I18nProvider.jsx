'use client';
import '@/i18n'; // Side-effect import — initializes i18next on the client
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

export default function I18nProvider({ children }) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
