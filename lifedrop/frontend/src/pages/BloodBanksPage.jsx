import React from 'react';
import { useQuery } from 'react-query';
import { bloodBankAPI } from '../services/api';
import { useGeolocation } from '../hooks/useGeolocation';

export default function BloodBanksPage() {
  const { location } = useGeolocation(true);

  const { data, isLoading } = useQuery(
    ['blood-banks', location],
    () => bloodBankAPI.nearby({ lat: location?.lat, lng: location?.lng, radius_km: 25 }),
    { enabled: !!location, select: r => r.data }
  );

  const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

  return (
    <div>
      <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 20, marginBottom: 16 }}>Blood banks nearby</h2>

      {isLoading && <div style={{ textAlign: 'center', padding: 30, color: '#AEACAA' }}>Finding blood banks...</div>}

      {data?.blood_banks?.map(bank => (
        <div key={bank.id} style={{ background: '#fff', border: '1px solid #E8E4DF', borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>🏥 {bank.name}</div>
              <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>{bank.address}</div>
              <div style={{ fontSize: 12, color: '#6B6860', marginTop: 2 }}>📞 {bank.phone}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#6B6860' }}>{bank.distance_km} km</div>
              {bank.open_24h && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#E1F5EE', color: '#085041', marginTop: 4, display: 'inline-block' }}>24/7</span>}
            </div>
          </div>

          {bank.inventory && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: '#AEACAA', marginBottom: 6 }}>Stock availability</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {BLOOD_GROUPS.map(bg => {
                  const units = bank.inventory?.[bg];
                  return (
                    <span key={bg} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500,
                      background: units > 0 ? '#E1F5EE' : '#F1EFE8',
                      color: units > 0 ? '#085041' : '#AEACAA',
                    }}>
                      {bg}: {units ?? 0}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {!isLoading && !data?.blood_banks?.length && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#AEACAA' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏥</div>
          <p>No blood banks found nearby.</p>
        </div>
      )}
    </div>
  );
}
