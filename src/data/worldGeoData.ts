// Simplified World GeoJSON FeatureCollection for D3.js Global Threat Map
// Contains accurate continental and major landmass outlines optimized for fast vector rendering.

export interface GeoFeature {
  type: 'Feature';
  properties: {
    name: string;
    continent: string;
    regionCode: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface WorldGeoData {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export interface TargetGeoLocation {
  target: string;
  ip: string;
  city: string;
  country: string;
  countryCode: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific' | 'Latin America' | 'Middle East' | 'Africa';
  provider: string;
  coordinates: [number, number]; // [longitude, latitude]
}

// Pre-correlated registry of bug bounty targets and cloud infrastructure
export const TARGET_GEO_REGISTRY: Record<string, TargetGeoLocation> = {
  'api.finpay-global.com': {
    target: 'api.finpay-global.com',
    ip: '104.21.48.192',
    city: 'Ashburn, VA',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'AWS us-east-1 (Cloudflare Edge)',
    coordinates: [-77.4875, 39.0438]
  },
  'app.cloudmetrics.io': {
    target: 'app.cloudmetrics.io',
    ip: '54.210.12.88',
    city: 'Boardman, OR',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'AWS us-west-2 (Oregon)',
    coordinates: [-119.7006, 45.8399]
  },
  'hub.devspace.net': {
    target: 'hub.devspace.net',
    ip: '185.199.108.153',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    region: 'Europe',
    provider: 'Equinix FR5 / Hetzner Cloud',
    coordinates: [8.6821, 50.1109]
  },
  'auth.streamflow.com': {
    target: 'auth.streamflow.com',
    ip: '35.208.112.4',
    city: 'Council Bluffs, IA',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'GCP us-central1 (Iowa)',
    coordinates: [-95.8608, 41.2619]
  },
  'static-assets.enterprise-store.com': {
    target: 'static-assets.enterprise-store.com',
    ip: '52.216.144.12',
    city: 'Reston, VA',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'AWS S3 us-east-1 (Orphaned Bucket)',
    coordinates: [-77.3570, 38.9586]
  },
  'api.globaltravel.com': {
    target: 'api.globaltravel.com',
    ip: '13.248.212.19',
    city: 'Dublin',
    country: 'Ireland',
    countryCode: 'IE',
    region: 'Europe',
    provider: 'AWS eu-west-1 (Ireland Gateway)',
    coordinates: [-6.2603, 53.3498]
  },
  'cdn.devspace.net': {
    target: 'cdn.devspace.net',
    ip: '151.101.65.140',
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    region: 'Europe',
    provider: 'Fastly Edge PoP (AMS)',
    coordinates: [4.9041, 52.3676]
  },
  'core-api.target.com': {
    target: 'core-api.target.com',
    ip: '34.223.18.91',
    city: 'San Jose, CA',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'AWS us-west-1 (Silicon Valley)',
    coordinates: [-121.8863, 37.3382]
  }
};

// Fallback pool of realistic cloud datacenter hubs across continents
const REGIONAL_FALLBACK_HUBS: TargetGeoLocation[] = [
  {
    target: 'aws-us-east',
    ip: '52.95.245.1',
    city: 'Northern Virginia',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'AWS us-east-1',
    coordinates: [-77.0469, 38.8048]
  },
  {
    target: 'aws-eu-central',
    ip: '18.194.0.1',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    region: 'Europe',
    provider: 'AWS eu-central-1',
    coordinates: [8.6821, 50.1109]
  },
  {
    target: 'aws-ap-southeast',
    ip: '13.228.0.1',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    region: 'Asia-Pacific',
    provider: 'AWS ap-southeast-1',
    coordinates: [103.8198, 1.3521]
  },
  {
    target: 'aws-sa-east',
    ip: '54.207.0.1',
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    region: 'Latin America',
    provider: 'AWS sa-east-1 (SP4)',
    coordinates: [-46.6333, -23.5505]
  },
  {
    target: 'aws-ap-northeast',
    ip: '54.64.0.1',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    provider: 'AWS ap-northeast-1',
    coordinates: [139.6917, 35.6895]
  },
  {
    target: 'aws-eu-west',
    ip: '52.16.0.1',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    region: 'Europe',
    provider: 'AWS eu-west-2',
    coordinates: [-0.1278, 51.5074]
  },
  {
    target: 'aws-ap-southeast-2',
    ip: '13.54.0.1',
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    region: 'Asia-Pacific',
    provider: 'AWS ap-southeast-2',
    coordinates: [151.2093, -33.8688]
  },
  {
    target: 'gcp-us-central',
    ip: '35.192.0.1',
    city: 'Council Bluffs, IA',
    country: 'United States',
    countryCode: 'US',
    region: 'North America',
    provider: 'GCP us-central1',
    coordinates: [-95.8608, 41.2619]
  }
];

/**
 * Deterministically resolves or generates geo-location telemetry for any target domain
 */
export function resolveTargetGeoLocation(targetName: string): TargetGeoLocation {
  const normalized = (targetName || '').trim().toLowerCase();
  
  if (TARGET_GEO_REGISTRY[normalized]) {
    return TARGET_GEO_REGISTRY[normalized];
  }

  // Look for domain match in known targets
  for (const [key, val] of Object.entries(TARGET_GEO_REGISTRY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return { ...val, target: targetName };
    }
  }

  // Deterministic hash to assign one of the cloud datacenter hubs
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % REGIONAL_FALLBACK_HUBS.length;
  const hub = REGIONAL_FALLBACK_HUBS[index];

  // Derive realistic IP suffix from hash
  const octet3 = (Math.abs(hash) % 250) + 1;
  const octet4 = ((Math.abs(hash) >> 4) % 250) + 1;
  const parts = hub.ip.split('.');
  const derivedIp = `${parts[0]}.${parts[1]}.${octet3}.${octet4}`;

  // Slight jitter (+/- 0.8 deg) so overlapping targets in the same datacenter don't stack exactly on top of each other
  const jitterLon = ((Math.abs(hash * 17) % 100) / 100 - 0.5) * 1.6;
  const jitterLat = ((Math.abs(hash * 31) % 100) / 100 - 0.5) * 1.6;

  return {
    target: targetName,
    ip: derivedIp,
    city: hub.city,
    country: hub.country,
    countryCode: hub.countryCode,
    region: hub.region,
    provider: hub.provider,
    coordinates: [
      Math.round((hub.coordinates[0] + jitterLon) * 1000) / 1000,
      Math.round((hub.coordinates[1] + jitterLat) * 1000) / 1000
    ]
  };
}

/**
 * Accurate simplified landmass GeoJSON collection for continents and major islands.
 * Longitude: [-180, 180], Latitude: [-90, 90]
 */
export const WORLD_CONTINENTS_GEOJSON: WorldGeoData = {
  type: 'FeatureCollection',
  features: [
    // North America
    {
      type: 'Feature',
      properties: { name: 'North America', continent: 'North America', regionCode: 'NA' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-168.0, 65.5], [-162.0, 70.0], [-140.0, 70.0], [-130.0, 70.0], [-120.0, 76.0],
          [-95.0, 76.0], [-80.0, 70.0], [-65.0, 60.0], [-55.0, 52.0], [-60.0, 46.0],
          [-66.0, 44.0], [-71.0, 42.0], [-75.0, 35.0], [-80.0, 25.0], [-81.0, 25.0],
          [-88.0, 30.0], [-97.0, 26.0], [-97.0, 20.0], [-90.0, 16.0], [-84.0, 10.0],
          [-77.0, 8.0], [-83.0, 8.5], [-92.0, 15.0], [-105.0, 20.0], [-115.0, 30.0],
          [-124.0, 38.0], [-124.0, 48.0], [-130.0, 54.0], [-140.0, 60.0], [-152.0, 58.0],
          [-165.0, 60.0], [-168.0, 65.5]
        ]]
      }
    },
    // Greenland
    {
      type: 'Feature',
      properties: { name: 'Greenland', continent: 'North America', regionCode: 'GL' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-44.0, 60.0], [-20.0, 70.0], [-18.0, 80.0], [-35.0, 83.0], [-60.0, 82.0],
          [-70.0, 76.0], [-55.0, 70.0], [-50.0, 64.0], [-44.0, 60.0]
        ]]
      }
    },
    // South America
    {
      type: 'Feature',
      properties: { name: 'South America', continent: 'South America', regionCode: 'SA' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-77.0, 8.0], [-72.0, 11.5], [-62.0, 10.5], [-50.0, 0.0], [-35.0, -5.0],
          [-35.0, -9.0], [-39.0, -18.0], [-43.0, -23.0], [-48.0, -28.0], [-53.0, -33.0],
          [-58.0, -38.0], [-65.0, -43.0], [-66.0, -54.0], [-74.0, -53.0], [-74.0, -42.0],
          [-71.0, -30.0], [-70.0, -18.0], [-81.0, -5.0], [-80.0, 2.0], [-77.0, 8.0]
        ]]
      }
    },
    // Europe
    {
      type: 'Feature',
      properties: { name: 'Europe', continent: 'Europe', regionCode: 'EU' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-9.5, 36.0], [-9.0, 43.0], [-1.5, 46.0], [-4.5, 48.5], [2.0, 51.0],
          [8.0, 54.0], [8.5, 57.0], [13.0, 55.5], [19.0, 54.5], [28.0, 59.0],
          [30.0, 65.0], [40.0, 68.0], [50.0, 68.0], [60.0, 65.0], [50.0, 55.0],
          [40.0, 50.0], [36.0, 46.0], [28.0, 41.5], [24.0, 38.0], [22.0, 36.5],
          [15.0, 40.0], [12.0, 44.0], [9.0, 43.0], [3.0, 42.5], [-3.0, 36.5],
          [-9.5, 36.0]
        ]]
      }
    },
    // Great Britain & Ireland
    {
      type: 'Feature',
      properties: { name: 'British Isles', continent: 'Europe', regionCode: 'UK' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-5.5, 50.0], [1.5, 52.5], [-0.5, 58.5], [-5.0, 58.5], [-6.0, 55.0],
          [-3.0, 51.5], [-5.5, 50.0]
        ]]
      }
    },
    // Scandinavia
    {
      type: 'Feature',
      properties: { name: 'Scandinavia', continent: 'Europe', regionCode: 'SCAN' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [5.0, 58.0], [10.0, 58.0], [18.0, 60.0], [24.0, 65.0], [30.0, 70.0],
          [24.0, 71.0], [14.0, 68.0], [5.0, 62.0], [5.0, 58.0]
        ]]
      }
    },
    // Africa
    {
      type: 'Feature',
      properties: { name: 'Africa', continent: 'Africa', regionCode: 'AF' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-5.5, 36.0], [11.0, 37.0], [32.0, 31.0], [35.0, 27.5], [43.5, 12.5],
          [51.0, 12.0], [42.0, -2.0], [40.0, -11.0], [35.0, -24.0], [28.0, -32.5],
          [20.0, -35.0], [18.0, -34.0], [13.0, -22.0], [12.0, -8.0], [9.0, 4.0],
          [2.0, 6.0], [-13.0, 9.0], [-17.0, 15.0], [-17.0, 21.0], [-10.0, 28.0],
          [-5.5, 36.0]
        ]]
      }
    },
    // Asia
    {
      type: 'Feature',
      properties: { name: 'Asia', continent: 'Asia', regionCode: 'AS' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [60.0, 65.0], [70.0, 73.0], [100.0, 77.0], [140.0, 73.0], [170.0, 67.0],
          [170.0, 60.0], [156.0, 50.0], [140.0, 45.0], [130.0, 35.0], [122.0, 30.0],
          [118.0, 22.0], [108.0, 18.0], [103.0, 1.5], [98.0, 8.0], [89.0, 22.0],
          [80.0, 13.0], [77.0, 8.0], [73.0, 20.0], [68.0, 25.0], [60.0, 25.0],
          [50.0, 30.0], [35.0, 33.0], [28.0, 41.5], [36.0, 46.0], [50.0, 55.0],
          [60.0, 65.0]
        ]]
      }
    },
    // Japan
    {
      type: 'Feature',
      properties: { name: 'Japan', continent: 'Asia', regionCode: 'JP' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [131.0, 31.0], [135.0, 34.0], [140.0, 36.0], [141.5, 41.0], [145.0, 44.0],
          [141.0, 45.0], [139.0, 37.0], [131.0, 33.0], [131.0, 31.0]
        ]]
      }
    },
    // Australia
    {
      type: 'Feature',
      properties: { name: 'Australia', continent: 'Oceania', regionCode: 'AU' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [114.0, -22.0], [122.0, -17.0], [130.0, -12.0], [136.0, -12.0], [142.0, -11.0],
          [146.0, -19.0], [153.0, -28.0], [150.0, -37.0], [143.0, -38.5], [135.0, -35.0],
          [125.0, -33.0], [115.0, -34.0], [113.0, -26.0], [114.0, -22.0]
        ]]
      }
    },
    // New Zealand
    {
      type: 'Feature',
      properties: { name: 'New Zealand', continent: 'Oceania', regionCode: 'NZ' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [166.5, -46.0], [171.0, -42.0], [174.0, -41.0], [178.0, -37.5], [175.0, -35.0],
          [172.0, -41.0], [168.0, -44.0], [166.5, -46.0]
        ]]
      }
    },
    // Indonesia & Southeast Asia Islands
    {
      type: 'Feature',
      properties: { name: 'Maritime Southeast Asia', continent: 'Asia', regionCode: 'ID' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [95.5, 5.5], [105.0, -6.0], [115.0, -8.5], [125.0, -8.5], [130.0, -3.0],
          [120.0, 1.0], [110.0, 1.5], [100.0, 3.0], [95.5, 5.5]
        ]]
      }
    }
  ]
};
