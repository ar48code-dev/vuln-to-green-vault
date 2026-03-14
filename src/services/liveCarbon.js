/**
 * Live Carbon Service — Fetches real-time carbon intensity data
 * Integrates with Electricity Maps API or falls back to baseline data
 */

const axios = require('axios');
const greenOptimizer = require('../scanners/green');

class LiveCarbonService {
  constructor() {
    this.apiKey = process.env.ELECTRICITY_MAPS_API_KEY || null;
    this.baseUrl = 'https://api.electricitymap.org/v3';
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000; // 1 hour

    // Mapping GCP regions to Electricity Maps zones
    // Some are countries, some are specific grids
    this.regionMapping = {
      'us-central1': 'US-CENT-SPP',
      'us-east1': 'US-CAR-CPLE',
      'us-east4': 'US-MIDA-PJM',
      'us-west1': 'US-NW-PACW',
      'us-west2': 'US-CAL-CISO',
      'us-west3': 'US-NW-PACE',
      'us-west4': 'US-SW-WALC',
      'europe-west1': 'BE',
      'europe-west2': 'GB',
      'europe-west3': 'DE',
      'europe-west4': 'NL',
      'europe-west6': 'CH',
      'europe-west8': 'IT-NO',
      'europe-west9': 'FR',
      'europe-north1': 'FI',
      'europe-central2': 'PL',
      'asia-east1': 'TW',
      'asia-northeast1': 'JP-TK',
      'asia-south1': 'IN-WE',
      'asia-southeast1': 'SG',
      'australia-southeast1': 'AU-NSW',
      'southamerica-east1': 'BR-S'
    };
  }

  /**
   * Get carbon data for all regions, using live data where available
   */
  async getAllRegions(forceRefresh = false) {
    const baselineRegions = greenOptimizer.getGreenRegions();
    
    if (!this.apiKey) {
      return {
        regions: baselineRegions.map(r => ({ ...r, liveData: false })),
        liveRegions: 0,
        totalRegions: baselineRegions.length,
        sources: ['2024 Baseline']
      };
    }

    const liveData = await this.fetchLiveData(forceRefresh);
    const regions = baselineRegions.map(r => {
      const zone = this.regionMapping[r.region];
      if (zone && liveData[zone]) {
        return {
          ...r,
          carbon: Math.round(liveData[zone].carbonIntensity),
          renewable: Math.round(liveData[zone].renewablePercentage || r.renewable),
          liveData: true,
          fetchedAt: liveData[zone].fetchedAt,
          dataSource: 'Electricity Maps'
        };
      }
      return { ...r, liveData: false };
    });

    const liveCount = regions.filter(r => r.liveData).length;

    return {
      regions: regions.sort((a, b) => a.carbon - b.carbon),
      liveRegions: liveCount,
      totalRegions: regions.length,
      sources: liveCount > 0 ? ['Electricity Maps', 'Baseline'] : ['Baseline']
    };
  }

  /**
   * Fetch live data from Electricity Maps or return cache
   */
  async fetchLiveData(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.cache.has('live_data') && (now - this.cache.get('timestamp') < this.cacheTTL)) {
      return this.cache.get('live_data');
    }

    try {
      console.log('Fetching live carbon data from Electricity Maps...');
      // We'll fetch for common zones. Note: Free tier might have limits.
      // In a real app, we'd fetch only what's needed or use a paid tier.
      // For this hackathon, we'll try to fetch a representative sample or handle bulk if possible.
      
      const results = {};
      const zones = Object.values(this.regionMapping);
      
      // Batching or parallel requests if needed. For now, we'll simulate or use a specific endpoint if available.
      // Actually, Electricity Maps often requires one request per zone for history/latest.
      // We'll just fetch a few key ones to demonstrate "live" if the key is provided.
      
      const fetchPromises = zones.map(zone => 
        axios.get(`${this.baseUrl}/carbon-intensity/latest?zone=${zone}`, {
          headers: { 'auth-token': this.apiKey }
        }).then(res => {
          results[zone] = {
            carbonIntensity: res.data.carbonIntensity,
            fetchedAt: new Date().toISOString()
          };
        }).catch(err => {
          // Silently fail for specific zones
        })
      );

      await Promise.all(fetchPromises);
      
      if (Object.keys(results).length > 0) {
        this.cache.set('live_data', results);
        this.cache.set('timestamp', now);
      }
      
      return results;
    } catch (err) {
      console.error('Electricity Maps API error:', err.message);
      return {};
    }
  }
}

module.exports = new LiveCarbonService();
