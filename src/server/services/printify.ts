import { db, getSetting } from "../db/init.js";

const PRINTIFY_API_URL = "https://api.printify.com/v1";

interface PrintifyImage {
  id: string;
  file_name: string;
  height: number;
  width: number;
  size: number;
  mime_type: string;
  preview_url: string;
  upload_time: string;
}

interface CreateProductPayload {
  title: string;
  description: string;
  blueprint_id: number;
  print_provider_id: number;
  variants: Array<{
    id: number;
    price: number;
    is_enabled: boolean;
  }>;
  print_areas: Array<{
    variant_ids: number[];
    placeholders: Array<{
      position: string;
      images: Array<{
        id: string;
        x: number;
        y: number;
        scale: number;
        angle: number;
      }>;
    }>;
  }>;
  tags: string[];
}

function getApiKey(): string {
  const key = process.env.PRINTIFY_API_KEY;
  if (!key) throw new Error("PRINTIFY_API_KEY not configured");
  return key;
}

function getShopId(): string {
  const id = process.env.PRINTIFY_SHOP_ID;
  if (!id) throw new Error("PRINTIFY_SHOP_ID not configured");
  return id;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PRINTIFY_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Printify API error: ${response.status} - ${error}`);
  }

  return response.json();
}

export async function uploadImageToPrintify(
  imageBuffer: Buffer,
  fileName: string
): Promise<PrintifyImage> {
  const base64Image = imageBuffer.toString("base64");
  
  const response = await apiRequest<PrintifyImage>(
    `/uploads/images.json`,
    {
      method: "POST",
      body: JSON.stringify({
        file_name: fileName,
        contents: base64Image,
      }),
    }
  );

  return response;
}

export async function createProductDraft(
  imageId: string,
  content: {
    title: string;
    description: string;
    bullets: string[];
    tags: string[];
  }
): Promise<{ id: string }> {
  const shopId = getShopId();
  const blueprintId = parseInt(getSetting("blueprint_id") || "145");
  const printProviderId = parseInt(getSetting("print_provider_id") || "99");
  const defaultPrice = parseInt(getSetting("default_price") || "1999");
  const variantIdsJson = getSetting("variant_ids") || "[]";
  const variantIds: number[] = JSON.parse(variantIdsJson);

  // If no variant IDs configured, fetch available variants
  let variants = variantIds;
  if (variants.length === 0) {
    const blueprintVariants = await getAvailableVariants(blueprintId, printProviderId);
    variants = blueprintVariants.slice(0, 100); // Max 100 variants
  }

  // Format description with bullets
  const fullDescription = [
    content.description,
    "",
    ...content.bullets.map(b => `• ${b}`)
  ].join("\n");

  const payload: CreateProductPayload = {
    title: content.title,
    description: fullDescription,
    blueprint_id: blueprintId,
    print_provider_id: printProviderId,
    variants: variants.map(id => ({
      id,
      price: defaultPrice,
      is_enabled: true,
    })),
    print_areas: [
      {
        variant_ids: variants,
        placeholders: [
          {
            position: "front",
            images: [
              {
                id: imageId,
                x: 0.5,
                y: 0.5,
                scale: 1,
                angle: 0,
              },
            ],
          },
        ],
      },
    ],
    tags: content.tags,
  };

  const response = await apiRequest<{ id: string }>(
    `/shops/${shopId}/products.json`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return response;
}

async function getAvailableVariants(
  blueprintId: number,
  printProviderId: number
): Promise<number[]> {
  const response = await apiRequest<{ variants: Array<{ id: number }> }>(
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`
  );
  
  return response.variants.map(v => v.id);
}

export async function getShops(): Promise<Array<{ id: number; title: string }>> {
  return apiRequest<Array<{ id: number; title: string }>>("/shops.json");
}

export async function getProduct(productId: string): Promise<unknown> {
  const shopId = getShopId();
  return apiRequest(`/shops/${shopId}/products/${productId}.json`);
}

export async function listProducts(
  page = 1,
  limit = 20
): Promise<{ data: unknown[]; total: number }> {
  const shopId = getShopId();
  return apiRequest(
    `/shops/${shopId}/products.json?page=${page}&limit=${limit}`
  );
}

export function logAction(
  productId: number | null,
  action: string,
  status: "success" | "error" | "info",
  message: string
): void {
  db.prepare(`
    INSERT INTO logs (product_id, action, status, message)
    VALUES (?, ?, ?, ?)
  `).run(productId, action, status, message);
}
