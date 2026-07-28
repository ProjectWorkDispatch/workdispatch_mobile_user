import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { WD } from '../../constants/theme';

type MapPickerProps = {
  lat: string | null;
  lng: string | null;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  readOnly?: boolean;
};

export function MapPicker({ lat, lng, onLocationChange, readOnly = false }: MapPickerProps) {
  const initialLat = lat ? parseFloat(lat) : 14.6349;
  const initialLng = lng ? parseFloat(lng) : -90.5069;
  const hasPosition = lat !== null && lng !== null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var marker = null;

        ${
          hasPosition
            ? `marker = L.marker([${initialLat}, ${initialLng}]).addTo(map);`
            : ''
        }

        ${readOnly ? '' : `
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          if (marker) {
            marker.setLatLng([lat, lng]);
          } else {
            marker = L.marker([lat, lng]).addTo(map);
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
        });
        `}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            onLocationChange(data.lat, data.lng);
          } catch {}
        }}
      />
      {lat !== null && lng !== null ? (
        <View style={styles.infoRow}>
          <Text style={styles.coordinates}>
            Ubicación: {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
          </Text>
          {!readOnly && (
            <TouchableOpacity onPress={() => onLocationChange(null, null)}>
              <Text style={styles.removeText}>Quitar ubicación</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.hint}>Toca el mapa para seleccionar la ubicación</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  webview: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: 13,
    color: WD.textGray,
  },
  removeText: {
    fontSize: 13,
    color: WD.red,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: WD.textGray,
  },
});
