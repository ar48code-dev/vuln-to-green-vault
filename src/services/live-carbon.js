// FILE: src/services/live-carbon.js
const axios = require('axios');

class LiveCarbonService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 60 minutes
    
    // Mapping of 33 GCP regions to various API zone identifiers
    this.regions = {
      'us-central1': { zone: 'US-MIDW-MISO', country: 'US', watttime: 'MISO_CENTRAL', iea2024: 454, name: 'Iowa, USA' },
      'us-east1': { zone: 'US-CAR-CPLE', country: 'US', watttime: 'CPLE', iea2024: 432, name: 'South Carolina, USA' },
      'us-east4': { zone: 'US-MIDA-PJM', country: 'US', watttime: 'PJM_NJ', iea2024: 358, name: 'Northern Virginia, USA' },
      'us-west1': { zone: 'US-NW-PACW', country: 'US', watttime: 'PACW', iea2024: 78, name: 'Oregon, USA' },
      'us-west2': { zone: 'US-CAL-CISO', country: 'US', watttime: 'CAISO_NORTH', iea2024: 218, name: 'Los Angeles, USA' },
      'us-west3': { zone: 'US-NW-PACE', country: 'US', watttime: 'PACE', iea2024: 564, name: 'Salt Lake City, USA' },
      'us-west4': { zone: 'US-SW-WALC', country: 'US', watttime: 'WALC', iea2024: 469, name: 'Las Vegas, USA' },
      'us-south1': { zone: 'US-TEX-ERCO', country: 'US', watttime: 'ERCOT_CENTRAL', iea2024: 431, name: 'Dallas, USA' },
      'northamerica-northeast1': { zone: 'CA-QC', country: 'CA', watttime: 'HQUE', iea2024: 25, name: 'Montréal, Canada' },
      'northamerica-northeast2': { zone: 'CA-ON', country: 'CA', watttime: 'IESO', iea2024: 35, name: 'Toronto, Canada' },
      'southamerica-east1': { zone: 'BR-S', country: 'BR', watttime: 'BR_SOUTH', iea2024: 92, name: 'São Paulo, Brazil' },
      'europe-west1': { zone: 'BE', country: 'BE', watttime: 'BE', iea2024: 186, name: 'Belgium' },
      'europe-west2': { zone: 'GB', country: 'GB', watttime: 'UK', iea2024: 257, name: 'London, UK' },
      'europe-west3': { zone: 'DE', country: 'DE', watttime: 'DE', iea2024: 338, name: 'Frankfurt, Germany' },
      'europe-west4': { zone: 'NL', country: 'NL', watttime: 'NL', iea2024: 410, name: 'Netherlands' },
      'europe-west6': { zone: 'CH', country: 'CH', watttime: 'CH', iea2024: 29, name: 'Zürich, Switzerland' },
      'europe-west8': { zone: 'IT-NO', country: 'IT', watttime: 'IT_NORTH', iea2024: 282, name: 'Milan, Italy' },
      'europe-west9': { zone: 'FR', country: 'FR', watttime: 'FR', iea2024: 55, name: 'Paris, France' },
      'europe-north1': { zone: 'FI', country: 'FI', watttime: 'FI', iea2024: 28, name: 'Finland' },
      'europe-central2': { zone: 'PL', country: 'PL', watttime: 'PL', iea2024: 614, name: 'Warsaw, Poland' },
      'asia-east1': { zone: 'TW', country: 'TW', watttime: 'TW', iea2024: 541, name: 'Taiwan' },
      'asia-east2': { zone: 'HK', country: 'HK', watttime: 'HK', iea2024: 453, name: 'Hong Kong' },
      'asia-northeast1': { zone: 'JP-TK', country: 'JP', watttime: 'JP_TOKYO', iea2024: 506, name: 'Tokyo, Japan' },
      'asia-northeast2': { zone: 'JP-KN', country: 'JP', watttime: 'JP_KANSAI', iea2024: 401, name: 'Osaka, Japan' },
      'asia-northeast3': { zone: 'KR', country: 'KR', watttime: 'KR', iea2024: 450, name: 'Seoul, South Korea' },
      'asia-south1': { zone: 'IN-WE', country: 'IN', watttime: 'IN_WEST', iea2024: 708, name: 'Mumbai, India' },
      'asia-south2': { zone: 'IN-NO', country: 'IN', watttime: 'IN_NORTH', iea2024: 672, name: 'Delhi, India' },
      'asia-southeast1': { zone: 'SG', country: 'SG', watttime: 'SG', iea2024: 408, name: 'Singapore' },
      'asia-southeast2': { zone: 'ID', country: 'ID', watttime: 'ID', iea2024: 580, name: 'Jakarta, Indonesia' },
      'australia-southeast1': { zone: 'AU-NSW', country: 'AU', watttime: 'AU_NSW', iea2024: 550, name: 'Sydney, Australia' },
      'australia-southeast2': { zone: 'AU-VIC', country: 'AU', watttime: 'AU_VIC', iea2024: 96, name: 'Melbourne, Australia' },
      'me-west1': { zone: 'IL', country: 'IL', watttime: 'IL', iea2024: 600, name: 'Tel Aviv, Israel' },
      'me-central1': { zone: 'QA', country: 'QA', watttime: 'QA', iea2024: 550, name: 'Doha, Qatar' }
    };
  }

  async getCarbonForRegion(gcpRegion) {
    const config = this.regions[gcpRegion];
    if (!config) return null;

    // Check Cache
    const cached = this.cache.get(gcpRegion);
    if (cached && (Date.now() - cached.fetchedAt < this.cacheTTL)) {
      return cached;
    }

    let result = null;

    // 1. Electricity Maps
    if (process.env.ELECTRICITY_MAPS_API_KEY) {
      try {
        const headers = { 'auth-token': process.env.ELECTRICITY_MAPS_API_KEY };
        const [intensityRes, powerRes] = await Promise.all([
          axios.get(`https://api.electricitymap.org/v3/carbon-intensity/latest?zone=${config.zone}`, { headers }),
          axios.get(`https://api.electricitymap.org/v3/power-breakdown/latest?zone=${config.zone}`, { headers }).catch(() => null)
        ]);

        if (intensityRes.data && intensityRes.data.carbonIntensity !== undefined) {
          result = {
            carbon: intensityRes.data.carbonIntensity,
            renewable: powerRes?.data?.renewablePercentage || 0,
            source: 'Electricity Maps',
            liveData: true,
            dataYear: new Date().getFullYear(),
            fetchedAt: Date.now(),
            regionName: config.name
          };
        }
      } catch (err) { /* silent fallback */ }
    }

    // 2. CO2Signal
    if (!result && process.env.CO2SIGNAL_API_KEY) {
      try {
        const res = await axios.get(`https://api.co2signal.com/v1/latest?countryCode=${config.country}`, {
          headers: { 'auth-token': process.env.CO2SIGNAL_API_KEY }
        });
        if (res.data && res.data.data) {
          result = {
            carbon: res.data.data.carbonIntensity,
            renewable: 0, 
            source: 'CO2Signal',
            liveData: true,
            dataYear: new Date().getFullYear(),
            fetchedAt: Date.now(),
            regionName: config.name
          };
        }
      } catch (err) { /* silent fallback */ }
    }

    // 3. WattTime
    if (!result && process.env.WATTTIME_USER && process.env.WATTTIME_PASSWORD) {
      try {
        const loginRes = await axios.post('https://api.watttime.org/login', {}, {
          auth: { username: process.env.WATTTIME_USER, password: process.env.WATTTIME_PASSWORD }
        });
        if (loginRes.data && loginRes.data.token) {
          const signalRes = await axios.get(`https://api.watttime.org/v3/signal-index?ba=${config.watttime}`, {
            headers: { 'Authorization': `Bearer ${loginRes.data.token}` }
          });
          if (signalRes.data && signalRes.data.intensity) {
            result = {
              carbon: Math.round(signalRes.data.intensity * 0.4536),
              renewable: 0,
              source: 'WattTime',
              liveData: true,
              dataYear: new Date().getFullYear(),
              fetchedAt: Date.now(),
              regionName: config.name
            };
          }
        }
      } catch (err) { /* silent fallback */ }
    }

    // 4. UK Carbon Intensity (europe-west2 only)
    if (!result && gcpRegion === 'europe-west2') {
      try {
        const res = await axios.get('https://api.carbonintensity.org.uk/intensity');
        if (res.data && res.data.data && res.data.data[0]) {
          result = {
            carbon: res.data.data[0].intensity.actual || res.data.data[0].intensity.forecast,
            renewable: 0,
            source: 'UK Carbon Intensity',
            liveData: true,
            dataYear: new Date().getFullYear(),
            fetchedAt: Date.now(),
            regionName: config.name
          };
        }
      } catch (err) { /* silent fallback */ }
    }

    // 5. IEA 2024 Fallback
    if (!result) {
      result = {
        carbon: config.iea2024,
        renewable: 0,
        source: 'IEA 2024 Dataset',
        liveData: false,
        dataYear: 2024,
        fetchedAt: Date.now(),
        regionName: config.name
      };
    }

    this.cache.set(gcpRegion, result);
    return result;
  }

  async getAllRegionsLive() {
    const regionIds = Object.keys(this.regions);
    const results = [];
    const batchSize = 5;

    for (let i = 0; i < regionIds.length; i += batchSize) {
      const batch = regionIds.slice(i, i + batchSize);
      const batchPromises = batch.map(id => this.getCarbonForRegion(id));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      if (i + batchSize < regionIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const liveCount = results.filter(r => r.liveData).length;
    const sources = [...new Set(results.map(r => r.source))];

    return {
      regions: results.sort((a, b) => a.carbon - b.carbon).map((r, idx) => ({
        region: regionIds[idx],
        name: r.regionName,
        carbon: r.carbon,
        renewable: r.renewable,
        dataSource: r.source,
        liveData: r.liveData,
        dataYear: r.dataYear,
        fetchedAt: r.fetchedAt
      })).sort((a, b) => a.carbon - b.carbon),
      liveRegions: liveCount,
      totalRegions: regionIds.length,
      sources
    };
  }

  getSourceStatus() {
    return {
      electricityMaps: !!process.env.ELECTRICITY_MAPS_API_KEY,
      co2Signal: !!process.env.CO2SIGNAL_API_KEY,
      wattTime: !!(process.env.WATTTIME_USER && process.env.WATTTIME_PASSWORD),
      ieaDataset: true
    };
  }

  getCacheStatus() {
    return {
      itemCount: this.cache.size,
      ttlMinutes: this.cacheTTL / 60000,
      cachedRegions: Array.from(this.cache.keys())
    };
  }

  clearCache() {
    this.cache.clear();
    return true;
  }
}

module.exports = new LiveCarbonService();
