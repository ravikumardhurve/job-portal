import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from '../alert';
import { errorMessage } from '../api';
import { useSession } from '../session';
import { Button, Card, Heading, Loading, Notice, Page, styles, useRemote } from '../ui';

type AssetType = 'HERO_BANNER' | 'SERVICE_HERO' | 'SERVICE_GALLERY';
type Target = { type: AssetType; serviceSlug?: string };
type StoredImage = { key: string; url: string | null };
type Assets = { banners: StoredImage[]; services: { slug: string; title: string; hero: StoredImage | null; gallery: StoredImage[] }[]; rules: Record<AssetType, { mimeTypes: string[]; maxSizeBytes: number }>; galleryLimit: number };
type Signature = { uploadUrl: string; apiKey: string; timestamp: number; signature: string; publicId: string; resourceType: 'image'; deliveryType: 'upload'; receipt: string };
type Pending = Target & { publicId: string; resourceType: 'image'; deliveryType: 'upload'; receipt: string };
type Picked = { target: Target; file: DocumentPicker.DocumentPickerAsset; mime: string; size: number };

/** Optional navigation predicate for the owning app's native page dispatcher. */
export function nativePage(page: string) { return ['assets', 'banners', 'service-assets'].includes(page); }

export function AdminAssets({ page = 'assets' }: { page?: string }) {
  const { identity } = useSession();
  const allowed = identity?.kind === 'admin' && ['SUPER_ADMIN', 'ADMIN'].includes(identity.user.role);
  return <Page><Heading eyebrow="ADMIN MEDIA" title={page === 'banners' ? 'Homepage banners' : page === 'service-assets' ? 'Service photos' : 'Website images'} subtitle="JPG, PNG or WebP, up to 5 MB per image." />{!allowed ? <Notice error text="Full administrator access is required." /> : !nativePage(page) ? <Notice error text="Media page not found." /> : <AssetEditor key={page} page={page} />}</Page>;
}

function Preview({ uri, label }: { uri: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  return uri && !failed ? <Image alt={label} accessibilityLabel={label} source={{ uri }} resizeMode="contain" style={{ width: '100%', height: 180, backgroundColor: '#eef2ff', borderRadius: 10 }} onError={() => setFailed(true)} /> : <Notice text="Preview unavailable. You can still remove this image." />;
}

function ImageList({ target, list, disabled, reorder, remove }: { target: Target; list: StoredImage[]; disabled: boolean; reorder: (target: Target, list: StoredImage[], index: number, delta: number) => void; remove: (target: Target, image: StoredImage) => void }) {
  return <>{list.map((image, index) => <Card key={image.key}><Text style={styles.label}>{target.type === 'SERVICE_HERO' ? 'Main service photo' : `Image ${index + 1}`}</Text><Preview uri={image.url} label={`Saved image ${index + 1}`} />{target.type !== 'SERVICE_HERO' && <View style={[styles.row, { flexWrap: 'wrap' }]}><Button label="Move earlier" secondary disabled={disabled || index === 0} onPress={() => reorder(target, list, index, -1)} /><Button label="Move later" secondary disabled={disabled || index === list.length - 1} onPress={() => reorder(target, list, index, 1)} /></View>}<Button label="Remove image" secondary disabled={disabled} onPress={() => remove(target, image)} /></Card>)}</>;
}

function AssetEditor({ page }: { page: string }) {
  const { api } = useSession();
  const remote = useRemote<{ data: Assets }>('admin/assets');
  const data = remote.data?.data;
  const [busy, setBusy] = useState(false), [stage, setStage] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [picked, setPicked] = useState<Picked | null>(null), [pending, setPending] = useState<Pending | null>(null);
  const locked = useRef(false), controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const disabled = busy || remote.loading || !!remote.error || !!pending || !!picked;

  async function run(work: (signal: AbortSignal) => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    const abort = new AbortController(); controller.current = abort;
    try { await work(abort.signal); }
    catch (cause) { setError(abort.signal.aborted ? 'Operation interrupted. Refresh to check the saved state before retrying.' : errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); setStage(''); if (controller.current === abort) controller.current = null; }
  }
  function choose(target: Target) {
    void run(async signal => {
      if (!data) return;
      setStage('Choose an image…');
      const result = await DocumentPicker.getDocumentAsync({ type: data.rules[target.type].mimeTypes, multiple: false, copyToCacheDirectory: true });
      if (result.canceled || signal.aborted) return;
      const file = result.assets[0];
      const mimeByExtension: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      const extensionMime = mimeByExtension[file.name.split('.').pop()?.toLowerCase() ?? ''];
      const mime = file.mimeType && file.mimeType !== 'application/octet-stream' ? file.mimeType : extensionMime;
      const size = file.size ?? file.file?.size;
      if (!mime || mime !== extensionMime || !data.rules[target.type].mimeTypes.includes(mime)) throw new Error('Choose a JPG, PNG or WebP file with a matching extension.');
      if (!size || !Number.isSafeInteger(size) || size > data.rules[target.type].maxSizeBytes) throw new Error('Choose a non-empty image up to 5 MB with a readable file size.');
      setPicked({ target, file, mime, size });
    });
  }
  async function confirm(upload: Pending, signal: AbortSignal) {
    setStage('Verifying and saving image…');
    const result = await api<{ message: string }>('admin/assets/upload-confirm', { method: 'POST', body: upload, signal });
    setPending(null); setPicked(null); setMessage(result.message); remote.refresh();
  }
  function discardPending(reselect = false) {
    if (!pending || locked.current) return;
    const target: Target = { type: pending.type, ...(pending.serviceSlug ? { serviceSlug: pending.serviceSlug } : {}) };
    Alert.alert(reselect ? 'Choose another image?' : 'Discard upload attempt?', 'This clears the pending upload from this screen. Any image already saved stays on the page. Unsaved files are not deleted and may need storage cleanup.', [
      { text: 'Cancel', style: 'cancel' },
      { text: reselect ? 'Choose another' : 'Discard', onPress: () => {
        if (locked.current) return;
        setPending(null); setPicked(null); setError(''); setMessage('');
        if (reselect) choose(target);
        else { setMessage('Pending upload discarded. You can choose a new image.'); remote.refresh(); }
      } },
    ]);
  }
  function upload() {
    if (!picked) return;
    const selection = picked;
    void run(async signal => {
      setStage('Preparing upload…');
      const { data: signature } = await api<{ data: Signature }>('admin/assets/upload-url', { method: 'POST', body: { ...selection.target, fileName: selection.file.name, contentType: selection.mime, fileSize: selection.size }, signal });
      if (!/^https:\/\/api\.cloudinary\.com\/v1_1\/[^/?#]+\/image\/upload$/.test(signature.uploadUrl) || signature.deliveryType !== 'upload' || signature.resourceType !== 'image') throw new Error('Invalid image upload destination.');
      const form = new FormData();
      if (Platform.OS === 'web') {
        if (!selection.file.file) throw new Error('File is unavailable. Please choose it again.');
        form.append('file', selection.file.file);
      } else form.append('file', { uri: selection.file.uri, name: selection.file.name, type: selection.mime } as unknown as Blob);
      form.append('api_key', signature.apiKey); form.append('timestamp', String(signature.timestamp));
      form.append('signature', signature.signature); form.append('public_id', signature.publicId);
      setStage(`Uploading ${selection.file.name}…`);
      const abortUpload = new AbortController();
      const abort = () => abortUpload.abort();
      signal.addEventListener('abort', abort);
      if (signal.aborted) abort();
      const timer = setTimeout(abort, 120000);
      try {
        // No portal bearer token or cookies are sent to Cloudinary.
        const response = await fetch(signature.uploadUrl, { method: 'POST', body: form, credentials: 'omit', signal: abortUpload.signal });
        const result = await response.json() as { public_id?: string; resource_type?: string; type?: string; error?: { message?: string } };
        if (!response.ok || result.error) throw new Error(result.error?.message ?? 'Image upload failed.');
        if (result.public_id !== signature.publicId || result.resource_type !== 'image' || result.type !== 'upload') throw new Error('Storage returned an unexpected image.');
      } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
      const next: Pending = { ...selection.target, publicId: signature.publicId, resourceType: 'image', deliveryType: 'upload', receipt: signature.receipt };
      setPending(next); setPicked(null);
      await confirm(next, signal);
    });
  }
  function remove(target: Target, image: StoredImage) {
    Alert.alert('Remove image?', 'This removes the image from the public page and deletes its stored file.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { void run(async signal => {
        const result = await api<{ message: string }>('admin/assets/remove', { method: 'DELETE', body: { ...target, fileKey: image.key }, signal });
        setMessage(result.message); remote.refresh();
      }); } },
    ]);
  }
  function reorder(target: Target, images: StoredImage[], index: number, delta: number) {
    const expectedKeys = images.map(image => image.key), keys = [...expectedKeys];
    [keys[index], keys[index + delta]] = [keys[index + delta], keys[index]];
    void run(async signal => {
      const result = await api<{ message: string }>('admin/assets/reorder', { method: 'PATCH', body: { ...target, expectedKeys, keys }, signal });
      setMessage(result.message); remote.refresh();
    });
  }

  return <>
    <Notice text={error || remote.error} error /><Notice text={message} /><Notice text={stage} />
    <Button label="Refresh images" secondary disabled={busy} onPress={remote.refresh} />
    {picked && <Card><Text style={styles.subheading}>Ready to upload</Text><Text style={styles.muted}>{picked.file.name} · {(picked.size / 1048576).toFixed(2)} MB</Text><Preview uri={picked.file.uri} label="Selected image preview" /><Button label="Upload and publish image" busy={busy} onPress={() => {
      const current = data?.services.find(service => service.slug === picked.target.serviceSlug)?.hero;
      if (picked.target.type === 'SERVICE_HERO' && current) Alert.alert('Replace service photo?', 'The current hero photo will be removed after the new image is saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Replace', style: 'destructive', onPress: upload }]);
      else upload();
    }} /><Button label="Cancel selection" secondary disabled={busy} onPress={() => setPicked(null)} /></Card>}
    {pending && <Card><Notice text="Your file uploaded. Retry saving if verification was interrupted. If the one-hour receipt expired or the image was rejected, choose another image or discard this pending upload." /><Button label="Retry saving upload" busy={busy} onPress={() => void run(signal => confirm(pending, signal))} /><Button label="Choose another image" secondary disabled={busy || !data} onPress={() => discardPending(true)} /><Button label="Discard attempt" secondary disabled={busy} onPress={() => discardPending()} /></Card>}
    {remote.loading ? <Loading /> : !remote.error && data && <>
      {page !== 'service-assets' && <Card><Text style={styles.subheading}>Homepage banners</Text><Text style={styles.muted}>Images appear in this order on the homepage.</Text><Button label="Choose banner image" disabled={disabled} onPress={() => choose({ type: 'HERO_BANNER' })} />{data.banners.length ? <ImageList target={{ type: 'HERO_BANNER' }} list={data.banners} disabled={disabled} reorder={reorder} remove={remove} /> : <Text style={styles.muted}>No uploaded banners yet.</Text>}</Card>}
      {page !== 'banners' && data.services.map(service => <Card key={service.slug}><Text style={styles.subheading}>{service.title}</Text><Button label={service.hero ? 'Choose replacement hero photo' : 'Choose hero photo'} disabled={disabled} onPress={() => choose({ type: 'SERVICE_HERO', serviceSlug: service.slug })} />{service.hero ? <ImageList target={{ type: 'SERVICE_HERO', serviceSlug: service.slug }} list={[service.hero]} disabled={disabled} reorder={reorder} remove={remove} /> : <Text style={styles.muted}>No custom hero photo. The default service photo is used.</Text>}<Text style={styles.label}>Gallery · {service.gallery.length}/{data.galleryLimit}</Text><Button label="Choose gallery image" disabled={disabled || service.gallery.length >= data.galleryLimit} onPress={() => choose({ type: 'SERVICE_GALLERY', serviceSlug: service.slug })} />{service.gallery.length ? <ImageList target={{ type: 'SERVICE_GALLERY', serviceSlug: service.slug }} list={service.gallery} disabled={disabled} reorder={reorder} remove={remove} /> : <Text style={styles.muted}>No uploaded gallery images. The default gallery is used.</Text>}</Card>)}
    </>}
  </>;
}
