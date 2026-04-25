interface Vendor {
  id: string;
  name: string;
  keywords: string[];
  itc_status: string;
  default_gst_rate: number;
}

export class VendorMatcher {
  private vendors: Vendor[];

  constructor(vendors: Vendor[]) {
    this.vendors = vendors;
  }

  /**
   * Finds a matching vendor based on the narration string
   * Simple naive string matching for MVP Phase 1
   * @param description Bank statement narrative description
   */
  public match(description: string): Vendor | null {
    const normalized = description.toUpperCase().replace(/[^A-Z0-9 ]/g, " ");

    for (const vendor of this.vendors) {
      for (const keyword of vendor.keywords) {
        const kwNormalized = keyword.toUpperCase();
        if (normalized.includes(kwNormalized)) {
          return vendor;
        }
      }
    }
    return null;
  }
}