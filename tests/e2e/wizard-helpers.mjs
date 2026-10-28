/** Stable-state checks wait for the content motion; dedicated tests sample it. */
export const waitForWizardMotion = ({waitFor}) => waitFor("document.querySelector('#lineup-wizard-dialog .lineup-sheet-content')?.dataset.transitioning!=='true'");
