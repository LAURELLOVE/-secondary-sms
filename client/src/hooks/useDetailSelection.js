import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// Keeps the selected list item in the URL (?open=<id>) so that on a phone the
// Android back button / app-bar arrow closes the detail screen and returns to the list.
export default function useDetailSelection() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedId = params.get('open');

  // Picking another item while one is already open replaces the entry instead of stacking history.
  const select = (id) => setParams({ open: id }, { replace: Boolean(selectedId) });

  const close = () => {
    if (location.key !== 'default') navigate(-1);
    else setParams({}, { replace: true });
  };

  return [selectedId, select, close];
}
