package app.recipio.local;

import static org.junit.Assert.*;
import java.util.Arrays;
import java.util.UUID;
import javax.crypto.spec.SecretKeySpec;
import org.junit.Test;

public class AiKeyInputTest {
    private String generatedKey() { return "sk-" + UUID.randomUUID() + "_test"; }

    private void rejected(String input, AiKeyInput.Problem expected) {
        AiKeyInput.InvalidInput error = assertThrows(AiKeyInput.InvalidInput.class,
            () -> AiKeyInput.prepare(input));
        assertEquals(expected, error.problem);
        assertFalse(error.getMessage().isBlank());
    }

    @Test public void validAsciiIsPreservedExactly() throws Exception {
        String key = generatedKey();
        char[] prepared = AiKeyInput.prepare(key);
        try { assertArrayEquals(key.toCharArray(), prepared); }
        finally { Arrays.fill(prepared, '\0'); }
    }

    @Test public void clipboardBoundaryWhitespaceBomAndZeroWidthSpaceAreRemoved() throws Exception {
        String key = generatedKey();
        for (String boundary : new String[]{" \t\r\n", "\u00a0", "\u2000", "\u202f", "\u3000", "\ufeff", "\u200b", "\ufeff\u00a0\u200b "}) {
            char[] prepared = AiKeyInput.prepare(boundary + key + boundary);
            try { assertArrayEquals(key.toCharArray(), prepared); }
            finally { Arrays.fill(prepared, '\0'); }
        }
    }

    @Test public void internalWhitespaceOrInvisibleCharactersAreNeverJoined() {
        for (String character : new String[]{" ", "\t", "\r\n", "\u00a0", "\ufeff", "\u200b", "\u202e", "\0"})
            rejected("sk-" + "a".repeat(12) + character + "b".repeat(12),
                AiKeyInput.Problem.INTERNAL_WHITESPACE_OR_INVISIBLE);
    }

    @Test public void maskedConsoleValuesHaveActionableError() {
        for (String character : new String[]{"*", "•", "●", "…"})
            rejected("sk-" + character.repeat(6), AiKeyInput.Problem.MASKED);
    }

    @Test public void emptyAndBoundaryOnlyInputAreRejected() {
        for (String input : new String[]{null, "", " \t\u00a0\ufeff\u200b"})
            rejected(input, AiKeyInput.Problem.EMPTY);
    }

    @Test public void prefixQuotesBearerAndLookalikesAreNotAutomaticallyRepaired() {
        String suffix = UUID.randomUUID().toString();
        for (String input : new String[]{"SK-" + suffix, "ｓｋ-" + suffix, "sk－" + suffix,
                "Bearer sk-" + suffix, "\"sk-" + suffix + "\""})
            rejected(input, AiKeyInput.Problem.PREFIX);
    }

    @Test public void originalLengthBoundsRemainStrict() throws Exception {
        for (int length : new int[]{20, 512}) {
            char[] prepared = AiKeyInput.prepare("sk-" + "x".repeat(length - 3));
            try { assertEquals(length, prepared.length); AiSecretEnvelope.validate(prepared); }
            finally { Arrays.fill(prepared, '\0'); }
        }
        rejected("sk-" + "x".repeat(16), AiKeyInput.Problem.TOO_SHORT);
        rejected("sk-" + "x".repeat(510), AiKeyInput.Problem.TOO_LONG);
    }

    @Test public void otherInvalidCharactersAreRejectedRatherThanTranslated() {
        for (String character : new String[]{"=", "/", "é", "😀", "－"})
            rejected("sk-" + UUID.randomUUID() + character, AiKeyInput.Problem.INVALID_CHARACTER);
    }

    @Test public void normalizedInputStillUsesUnchangedStrictEncryptedEnvelope() throws Exception {
        String key = generatedKey();
        char[] prepared = AiKeyInput.prepare("\ufeff\u00a0" + key + "\u200b");
        char[] decoded = null;
        try {
            SecretKeySpec encryptionKey = new SecretKeySpec(new byte[32], "AES");
            decoded = AiSecretEnvelope.decrypt(AiSecretEnvelope.encrypt(prepared, encryptionKey), encryptionKey);
            assertArrayEquals(key.toCharArray(), decoded);
            assertThrows(Exception.class, () -> AiSecretEnvelope.validate((key + "\u200b").toCharArray()));
        } finally {
            Arrays.fill(prepared, '\0');
            if (decoded != null) Arrays.fill(decoded, '\0');
        }
    }

    @Test public void errorNeverEchoesInputOrClaimsProviderAuthentication() {
        String input = generatedKey() + "=";
        AiKeyInput.InvalidInput error = assertThrows(AiKeyInput.InvalidInput.class,
            () -> AiKeyInput.prepare(input));
        assertFalse(error.getMessage().contains(input));
        assertFalse(error.getMessage().contains(input.substring(3)));
        assertEquals(AiKeyInput.Problem.INVALID_CHARACTER, error.problem);
    }
}
