#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../public/images" && pwd)"
mkdir -p "$TARGET_DIR"

curl -L "https://images.unsplash.com/photo-1759210720456-c9814f721479?auto=format&fit=crop&fm=webp&q=80&w=2000" -o "$TARGET_DIR/hero-night.webp"
curl -L "https://images.unsplash.com/photo-1676746424139-77f8bd8922a8?auto=format&fit=crop&fm=webp&q=80&w=1800" -o "$TARGET_DIR/booking-banner.webp"
curl -L "https://images.unsplash.com/photo-1766525037811-0d278449b9e3?auto=format&fit=crop&fm=webp&q=80&w=1600" -o "$TARGET_DIR/pricing-standard.webp"
curl -L "https://images.unsplash.com/photo-1689785280879-98b0fb52084d?auto=format&fit=crop&fm=webp&q=80&w=1600" -o "$TARGET_DIR/pricing-individual.webp"
curl -L "https://images.unsplash.com/photo-1755993071218-91e315259902?auto=format&fit=crop&fm=webp&q=80&w=1400" -o "$TARGET_DIR/empty-bookings.webp"
curl -L "https://images.unsplash.com/photo-1755993071218-91e315259902?auto=format&fit=crop&fm=webp&q=80&w=1200" -o "$TARGET_DIR/notifications.webp"

echo "Downloaded images to $TARGET_DIR"
