const fs = require('fs');
const file = 'c:\\\\Users\\\\kj\\\\Desktop\\\\FasilLink\\\\frontend\\\\src\\\\pages\\\\owner\\\\OwnerAddItem.tsx';
let content = fs.readFileSync(file, 'utf8');

const dynamicCategoryFields = `
        {/* Rent Type */}
        {saleType === 'Rent' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Rent Type
              <select value={rentType} onChange={(e) => setRentType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20">
                <option value="Daily">Daily</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </label>
          </div>
        )}

        {/* Dynamic Category Fields */}
        {category === 'Homes' && (
          <div className="space-y-6 rounded-2xl border border-brand-200 bg-brand-50/30 p-5 dark:border-brand-900/30 dark:bg-brand-900/10">
            <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Home Details</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Price Type
                <select value={homePriceType} onChange={(e) => setHomePriceType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="Total price">Total price</option>
                  <option value="Per square">Per square</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Area
                <input type="number" value={homeArea} onChange={(e) => setHomeArea(e.target.value)} placeholder="Area" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Bedrooms
                <input type="number" value={homeBedrooms} onChange={(e) => setHomeBedrooms(e.target.value)} placeholder="E.g. 3" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Bathrooms
                <input type="number" value={homeBathrooms} onChange={(e) => setHomeBathrooms(e.target.value)} placeholder="E.g. 2" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Amenities</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['WIFI', 'Kitchen', 'Furnished', 'Unfurnished', 'Parking Space', 'Balcony / Terrace', 'Security (Guard/CCTV)', 'Water & Electricity'].map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={homeAmenities.includes(amenity)} onChange={(e) => {
                      if (e.target.checked) setHomeAmenities([...homeAmenities, amenity]);
                      else setHomeAmenities(homeAmenities.filter(a => a !== amenity));
                    }} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {category === 'Vehicles' && (
          <div className="space-y-6 rounded-2xl border border-brand-200 bg-brand-50/30 p-5 dark:border-brand-900/30 dark:bg-brand-900/10">
            <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Vehicle Details</h3>
            <div className="grid gap-6 lg:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Year
                <input type="text" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="E.g. 2022" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Transmission
                <input type="text" value={vehicleTransmission} onChange={(e) => setVehicleTransmission(e.target.value)} placeholder="Automatic / Manual" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Fuel
                <input type="text" value={vehicleFuel} onChange={(e) => setVehicleFuel(e.target.value)} placeholder="Diesel / Petrol / EV" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Amenities & Features</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['Mileage (km)', 'Engine Size', 'New Condition', 'Used Condition', 'Air Conditioning', 'Sunroof', 'Bluetooth / Media System'].map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={vehicleAmenities.includes(amenity)} onChange={(e) => {
                      if (e.target.checked) setVehicleAmenities([...vehicleAmenities, amenity]);
                      else setVehicleAmenities(vehicleAmenities.filter(a => a !== amenity));
                    }} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {category === 'Event Materials' && (
          <div className="space-y-6 rounded-2xl border border-brand-200 bg-brand-50/30 p-5 dark:border-brand-900/30 dark:bg-brand-900/10">
            <h3 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Event Material Details</h3>
            <div className="grid gap-6 lg:grid-cols-3">
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Capacity
                <input type="text" value={eventCapacity} onChange={(e) => setEventCapacity(e.target.value)} placeholder="E.g. 500" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Setup Type
                <select value={eventSetupType} onChange={(e) => setEventSetupType(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="Full setup">Full setup</option>
                  <option value="Partial setup">Partial setup</option>
                  <option value="None">None</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Location Suitability
                <select value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                  <option value="Indoor">Indoor</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Both">Both</option>
                </select>
              </label>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Amenities & Info</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {['Capacity (Guests)', 'Material Type', 'Used Condition', 'New Condition', 'Delivery Available', 'Quantity Available'].map(amenity => (
                  <label key={amenity} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={eventAmenities.includes(amenity)} onChange={(e) => {
                      if (e.target.checked) setEventAmenities([...eventAmenities, amenity]);
                      else setEventAmenities(eventAmenities.filter(a => a !== amenity));
                    }} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
`;

const locationOriginal = `          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Location (optional)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="Gondar, Ethiopia"
            />
          </label>`;

const locationNew = `          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Location
            <input
              type="text"
              value="Gondar"
              disabled
              className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 cursor-not-allowed"
            />
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Subcity
            <select
              value={subcity}
              onChange={(e) => setSubcity(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
            >
              <option value="Fasil">Fasil</option>
              <option value="Arada">Arada</option>
              <option value="Maraki">Maraki</option>
              <option value="Azezo Teda">Azezo Teda</option>
              <option value="Zobel">Zobel</option>
              <option value="Jantekel">Jantekel</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            Kebele (Number)
            <input
              type="number"
              value={kebele}
              onChange={(e) => setKebele(e.target.value)}
              min="1" max="25"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-500/20"
              placeholder="E.g. 1"
              required
            />
          </label>`;

// Inject location fields
content = content.replace(locationOriginal, locationNew);

// Inject dynamic categories right after description label/textarea block ends
const descBlockEnd = `          />
        </label>`;

content = content.replace(descBlockEnd, descBlockEnd + '\n' + dynamicCategoryFields);

// Inject legal document upload and terms acceptance just before the images section
const imagesSectionStart = `        <div>
          <div className="mb-3 flex items-center justify-between gap-3">`;

const legalDocAndTerms = `        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Legal Document / Carta
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">Please upload a valid legal document to verify this property/item.</p>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setLegalDocument(e.target.files[0]);
                }
              }}
              className="w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/50 dark:file:text-brand-300"
              required
            />
            {legalDocument && <p className="text-xs text-brand-600 mt-1">Uploaded: {legalDocument.name}</p>}
          </div>

          <div className="flex items-center">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-brand-600"
                required
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                I accept the terms and conditions and certify that the information provided is accurate and the legal documents are authentic.
              </span>
            </label>
          </div>
        </div>

`;

content = content.replace(imagesSectionStart, legalDocAndTerms + imagesSectionStart);

fs.writeFileSync(file, content);
console.log('done');
