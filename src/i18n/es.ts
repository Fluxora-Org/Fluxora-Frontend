/**
 * Spanish translation catalog.
 *
 * Typed as `Partial<TranslationCatalog>` because the runtime (see
 * `translate` in `./index.tsx`) falls back to the English catalog for
 * untranslated keys. Missing keys are surfaced as warnings by
 * `localeChecker.ts` so coverage can be tracked without breaking the app.
 *
 * Naming / tone conventions:
 *   - Use "flujo" for "stream", "cartera" for "wallet", "cronograma" for
 *     "schedule", "financiación" for "funding".
 *   - Keep placeholders (`{name}`, `{count}`, etc.) verbatim.
 *   - Spanish plurals (`_one` / `_other`) follow the same singular/plural
 *     split as English.
 */

import type { TranslationCatalog } from "./index";

export const es: Partial<TranslationCatalog> = {
  // Common
  "common.usdcPerDay": "USDC por día",

  // CreateStreamModal General
  "createStream.title": "Crear flujo",
  "createStream.description":
    "Establezca el destinatario, la financiación y los detalles del cronograma para un nuevo flujo Stellar.",
  "createStream.accessibility.closeLabel": "Cerrar modal de creación de flujo",

  // CreateStreamModal Mode Toggle
  "createStream.modeToggle.wizardLabel": "Asistente",
  "createStream.modeToggle.advancedLabel": "Avanzado",
  "createStream.modeToggle.ariaLabel": "Modo de creación de flujo: {mode}",
  "createStream.modeToggle.wizardAria": "Asistente guiado de 3 pasos (predeterminado)",
  "createStream.modeToggle.advancedAria": "Formulario avanzado de una sola página con todos los campos",

  // CreateStreamModal Advanced mode (single-page)
  "createStream.advanced.section1Header": "Destinatario y cantidad",
  "createStream.advanced.section1Desc":
    "Indique quién recibe el flujo y cuántos USDC quedarán bloqueados.",
  "createStream.advanced.section2Header": "Tasa y cronograma",
  "createStream.advanced.section2Desc":
    "Configure con qué rapidez fluyen los USDC, cuándo comienza y un cliff opcional.",
  "createStream.advanced.section3Header": "Resumen y creación",
  "createStream.advanced.section3Desc":
    "Revise los detalles del flujo y envíelo a la red.",
  "createStream.advanced.createBtn": "Crear flujo",

  // CreateStreamModal Steps
  "createStream.steps.recipientAmount": "Destinatario y cantidad",
  "createStream.steps.rateSchedule": "Tasa y cronograma",
  "createStream.steps.reviewCreate": "Revisar y crear",

  // Stepper
  "createStream.stepper.navLabel": "Pasos para crear el flujo",
  "createStream.stepper.jumpToStepAria": "Volver al paso {step}: {label}",
  "createStream.stepper.compactStatus": "Paso {current} de {total}: {label}",

  // Step 1
  "createStream.step1.header": "Destinatario y cantidad",
  "createStream.step1.subheader":
    "Indique quién recibe el flujo y cuántos USDC quedarán bloqueados.",
  "createStream.step1.recipientLabel": "Destinatario",
  "createStream.step1.recipientHelper":
    "Introduzca una dirección Stellar válida (empieza por G, 56 caracteres)",
  "createStream.step1.recipientPlaceholder": "Pegue una dirección Stellar (G...)",
  "createStream.step1.depositLabel": "Cantidad del depósito",
  "createStream.step1.depositHelper":
    "Introduzca la cantidad total de USDC que se depositará en el flujo",
  "createStream.step1.depositPlaceholder": "$ 0,00 USDC",
  "createStream.step1.infoBoxTitle": "Bloqueo en contrato inteligente:",
  "createStream.step1.infoBoxText":
    "Sus USDC quedarán bloqueados en un contrato inteligente de Soroban. El destinatario podrá retirar la parte acumulada en cualquier momento.",

  // Step 2 (subset)
  "createStream.step2.header": "Tasa y cronograma",
  "createStream.step2.subheader":
    "Configure con qué rapidez fluyen los USDC y cuándo comienza.",
  "createStream.step2.rateLabel": "Tasa del flujo",
  "createStream.step2.durationLabel": "Duración del flujo",
  "createStream.step2.startTimeLabel": "Hora de inicio",
  "createStream.step2.startNowBtn": "Empezar ahora",
  "createStream.step2.customDateBtn": "Fecha personalizada",
  "createStream.step2.cliffPeriodLabel": "Periodo de cliff",
  "createStream.step2.optionalLabel": "(opcional)",
  "createStream.step2.enableCliffLabel": "Activar cliff (bloqueo hasta una fecha concreta)",
  "createStream.step2.cliffDateLabel": "Fecha del cliff",
  "createStream.step2.requiredDepositLabel": "Depósito requerido",
  "createStream.step2.yourDepositLabel": "Su depósito",

  // Step 3 (subset)
  "createStream.step3.recipientCardTitle": "Destinatario",
  "createStream.step3.editBtn": "Editar",
  "createStream.step3.addressLabel": "Dirección",
  "createStream.step3.depositCardTitle": "Depósito",
  "createStream.step3.rateScheduleCardTitle": "Tasa y cronograma",
  "createStream.step3.rateLabel": "Tasa",
  "createStream.step3.rateValue": "{accrualRate} USDC por día",
  "createStream.step3.durationLabel": "Duración",
  "createStream.step3.durationValue": "{duration} {unit}",
  "createStream.step3.startLabel": "Inicio",
  "createStream.step3.startImmediately": "Inmediatamente",
  "createStream.step3.cliffLabel": "Cliff",
  "createStream.step3.cliffNotSet": "Sin configurar",
  "createStream.step3.errorTitle": "No se pudo crear el flujo.",
  "createStream.step3.tryAgainBtn": "Intentar de nuevo",

  // Buttons
  "createStream.button.submitting": "Enviando...",
  "createStream.button.confirming": "Confirmando...",
  "createStream.button.retry": "Reintentar crear flujo",
  "createStream.button.next": "Siguiente",
  "createStream.button.create": "Crear flujo",
  "createStream.button.back": "Atrás",
  "createStream.button.cancel": "Cancelar",
  "createStream.button.queued": "En cola — esperando conexión",
  "createStream.button.flushing": "Enviando flujo en cola...",

  // Validation (subset)
  "createStream.validation.ratePositive": "La tasa del flujo debe ser un número positivo.",
  "createStream.validation.recipientRequired": "El destinatario es obligatorio.",
  "createStream.validation.recipientInvalid":
    "Introduzca una dirección Stellar válida (empieza por G, 56 caracteres).",
  "createStream.validation.depositPositive":
    "La cantidad del depósito debe ser un número positivo.",
  "createStream.validation.walletNotConnected": "Conecte primero su cartera.",
  "createStream.error.generic": "No se pudo crear el flujo. Inténtelo de nuevo.",
  "createStream.success.message": "¡Flujo creado con éxito en la red!",

  // Wallet connection notice
  "walletConnection.ariaLabel": "Estado de conexión de la cartera",
  "walletConnection.lost": "Se perdió la conexión con la cartera. Se conserva su progreso.",
  "walletConnection.reconnecting": "Reconectando cartera…",
  "walletConnection.reconnectButton": "Reconectar cartera",

  // Connect wallet modal (subset)
  "connectWallet.stepLabel": "Paso 1 de 1",
  "connectWallet.title": "Elija su cartera",
  "connectWallet.description":
    "Seleccione un proveedor para conectarse. Revisará y aprobará la solicitud en su cartera.",
  "connectWallet.connecting": "Conectando...",
  "connectWallet.termsPrefix": "Al continuar, acepta los",
  "connectWallet.termsLink": "Términos de servicio",
  "connectWallet.comingSoon": "próximamente",

  // Plurals
  "createStream.duration.day_one": "día",
  "createStream.duration.day_other": "días",
  "createStream.duration.month_one": "mes",
  "createStream.duration.month_other": "meses",

  // Streams.tsx (subset)
  "streams.hero.eyebrow": "Streaming de tesorería",
  "streams.hero.title": "Flujos",
  "streams.hero.createBtn": "Crear flujo",
  "streams.hero.featuredBtn": "Abrir análisis destacado",
  "streams.summary.activeStreamsLabel": "Flujos activos",
  "streams.summary.monthlyOutflowLabel": "Salida mensual",
  "streams.summary.withdrawableNowLabel": "Retirable ahora",
  "streams.summary.nextUnlockLabel": "Próximo desbloqueo",
  "streams.list.title": "Lista lista para análisis",
  "streams.list.searchPlaceholder": "Buscar flujos...",
  "streams.list.sortRecent": "Más reciente",
  "streams.list.sortName": "Nombre (A-Z)",
  "streams.list.sortRate": "Mayor tasa",
  "streams.filter.all": "Todos",
  "streams.filter.active": "Activos",
  "streams.filter.paused": "Pausados",
  "streams.filter.completed": "Completados",
  "streams.emptySearch.text": "Ningún flujo coincide con su búsqueda o filtro.",

  // Recipient page
  "recipient.balance.demo": "Saldo de demostración",
  "recipient.balance.live": "Saldo en vivo",
  "recipient.streams.heading": "Sus flujos",
  "recipient.streams.empty": "No se han encontrado flujos para esta dirección.",
  "recipient.address.label": "Dirección del destinatario",

  // CSV upload (subset)
  "csvUpload.mode.title": "¿Cómo le gustaría crear los flujos?",
  "csvUpload.mode.single": "Crear un solo flujo",
  "csvUpload.mode.bulk": "Carga masiva desde CSV",
  "csvUpload.upload.title": "Cargar CSV de destinatarios",
  "csvUpload.upload.browse": "o haga clic para buscar archivos",
  "csvUpload.upload.parsing": "Procesando archivo…",
  "csvUpload.preview.statusValid": "Válido",
  "csvUpload.preview.statusNeedsFix": "Requiere arreglo",
  "csvUpload.preview.statusDuplicate": "Duplicado",
  "csvUpload.preview.statusSkipped": "Omitido",
  "csvUpload.preview.fixBtn": "Arreglar",
  "csvUpload.preview.skipBtn": "Omitir fila",
};
