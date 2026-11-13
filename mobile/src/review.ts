import * as StoreReview from 'expo-store-review';

/** Shows Apple's / Google's own rating prompt (the stores decide whether it actually appears). */
export async function askForReview() {
  try {
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch {
    // never let a rating prompt get in the way
  }
}
