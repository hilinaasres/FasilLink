const fs = require('fs');
const file = 'c:\\\\Users\\\\kj\\\\Desktop\\\\FasilLink\\\\frontend\\\\src\\\\pages\\\\owner\\\\OwnerAddItem.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
const statesToAdd = `
  const [subcity, setSubcity] = useState('Fasil');
  const [kebele, setKebele] = useState('');
  const [legalDocument, setLegalDocument] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Dynamic Fields
  const [homePriceType, setHomePriceType] = useState('Total price');
  const [homeBedrooms, setHomeBedrooms] = useState('');
  const [homeBathrooms, setHomeBathrooms] = useState('');
  const [homeArea, setHomeArea] = useState('');
  const [homeAmenities, setHomeAmenities] = useState<string[]>([]);

  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleTransmission, setVehicleTransmission] = useState('');
  const [vehicleFuel, setVehicleFuel] = useState('');
  const [vehicleAmenities, setVehicleAmenities] = useState<string[]>([]);

  const [eventCapacity, setEventCapacity] = useState('');
  const [eventSetupType, setEventSetupType] = useState('Full setup');
  const [eventLocation, setEventLocation] = useState('Indoor');
  const [eventAmenities, setEventAmenities] = useState<string[]>([]);

  const [rentType, setRentType] = useState('Monthly');
`;

content = content.replace(/const \{ user \} = useAuth\(\);/, 'const { user } = useAuth();\n' + statesToAdd);

// 2. Update canSubmit
content = content.replace(
  /const canSubmit = useMemo\([\s\S]*?\]\n  \);/,
  `const canSubmit = useMemo(
    () =>
      title.trim() &&
      category.trim() &&
      description.trim() &&
      contactPhone.trim() &&
      Number(price) > 0 &&
      previews.length > 0 &&
      termsAccepted &&
      legalDocument !== null &&
      kebele.trim() !== '',
    [title, category, description, contactPhone, price, previews.length, termsAccepted, legalDocument, kebele]
  );`
);

// 3. Update resetForm
const resetFormUpdates = `    setSubcity('Fasil');
    setKebele('');
    setLegalDocument(null);
    setTermsAccepted(false);
    setHomePriceType('Total price');
    setHomeBedrooms('');
    setHomeBathrooms('');
    setHomeArea('');
    setHomeAmenities([]);
    setVehicleYear('');
    setVehicleTransmission('');
    setVehicleFuel('');
    setVehicleAmenities([]);
    setEventCapacity('');
    setEventSetupType('Full setup');
    setEventLocation('Indoor');
    setEventAmenities([]);
    setRentType('Monthly');
    setPaymentCompleted(false);
`;
content = content.replace(/setPaymentCompleted\(false\);/, resetFormUpdates);

// 4. Update handleSubmit validations
content = content.replace(
  /\} else if \(previews\.length === 0\) \{\s*setError\('Please upload at least one image\.'\);/,
  `} else if (previews.length === 0) {
        setError('Please upload at least one image.');
      } else if (!legalDocument) {
        setError('Please upload a legal document/carta.');
      } else if (!kebele) {
        setError('Please enter a kebele.');
      } else if (!termsAccepted) {
        setError('You must accept the terms and conditions.');`
);

// 5. Update handleSubmit formData
const formDataUpdates = `      const metadata: any = {};
      if (category === 'Homes') {
         metadata.priceType = homePriceType;
         metadata.bedrooms = homeBedrooms;
         metadata.bathrooms = homeBathrooms;
         metadata.area = homeArea;
         metadata.amenities = homeAmenities;
      } else if (category === 'Vehicles') {
         metadata.year = vehicleYear;
         metadata.transmission = vehicleTransmission;
         metadata.fuel = vehicleFuel;
         metadata.amenities = vehicleAmenities;
      } else if (category === 'Event Materials') {
         metadata.capacity = eventCapacity;
         metadata.setupType = eventSetupType;
         metadata.location = eventLocation;
         metadata.amenities = eventAmenities;
      }
      if (saleType === 'Rent') {
         metadata.rentType = rentType;
      }

      form.append('subcity', subcity);
      form.append('kebele', kebele);
      form.append('metadata', JSON.stringify(metadata));
      if (legalDocument) {
        form.append('legal_document', legalDocument);
      }
      
      files.slice(0, 5).forEach((file) => form.append('images', file));`;

content = content.replace(/files\.slice\(0, 5\)\.forEach\(\(file\) => form\.append\('images', file\)\);/, formDataUpdates);

fs.writeFileSync(file, content);
console.log('done');
